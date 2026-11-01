import asyncio
from contextlib import asynccontextmanager
import json
import logging
import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from openai import AsyncOpenAI, APIError, RateLimitError

from .config import Settings
from .corpus import Corpus
from .embeddings import make_embedder
from .generation import consultation_answer, generate, generate_full
from .groq import GroqClient, LLMBusy, TOKEN_COUNTER
from .followups import suggest_followups
from .models import ChatRequest
from .queries import plan_queries
from .quota import InviteGuard, QuotaDenied, hash_token, make_store, valid_shape
from .verification import verify_absences
from .retrieval import Retriever, query_for_messages
from .web import research_web, public_web_source, WebResearchError

logger = logging.getLogger('chati')


def create_app(settings: Settings | None = None):
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        app.state.corpus = Corpus(settings.corpus_dir, settings.index_enrichment)
        if not settings.provider_key:
            app.state.client = None
        elif settings.llm_provider == 'groq':
            app.state.client = GroqClient(settings)
        else:
            app.state.client = AsyncOpenAI(api_key=settings.api_key, timeout=settings.timeout, max_retries=1)
        app.state.embedder = make_embedder(settings, app.state.client if settings.llm_provider == 'openai' else None)
        app.state.retriever = Retriever(app.state.corpus, settings, app.state.embedder)
        app.state.semaphore = asyncio.Semaphore(settings.concurrency)
        app.state.quota = make_store(settings) if settings.beta_mode else None
        app.state.guard = InviteGuard()
        warmup = None
        if settings.embedding_provider == 'local' and settings.mode == 'hybrid':
            warmup = asyncio.create_task(app.state.embedder.embed(['échauffement'], 'query'))  # load the model before the first user
        yield
        if warmup:
            warmup.cancel()
        app.state.retriever.close()
        if app.state.client:
            await app.state.client.close()

    app = FastAPI(title="Chati, le Chat Insoumis", lifespan=lifespan)

    @app.middleware('http')
    async def bound_body(request: Request, call_next):
        if request.method == 'POST':
            # Bound actual received bytes, including requests without Content-Length.
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 192000:
                    from fastapi.responses import JSONResponse
                    return JSONResponse({'detail': 'Requête trop volumineuse'}, status_code=413)
            request._body = bytes(body)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        response.headers['X-Frame-Options'] = 'DENY'
        return response

    @app.get('/api/health')
    async def health():
        return {"status": "ok"}

    @app.get('/api/status')
    async def status():
        retriever = app.state.retriever
        return {'name': 'Chati', 'corpus_version': app.state.corpus.version,
                'measure_count': sum(r['type'] == 'mesure' for r in app.state.corpus.rows),
                'annex_count': sum(r['type'] == 'annexe_bloc' for r in app.state.corpus.rows),
                'retrieval_mode': settings.mode, 'provider': settings.llm_provider, 'beta_mode': settings.beta_mode, 'index_enrichment': settings.index_enrichment, 'synonyms': settings.synonyms,
                'query_planning': settings.query_planning, 'per_subsection': settings.per_subsection, 'verify_absence': settings.verify_absence, 'retrieval_count': settings.retrieval_count, 'context_mode': settings.context_mode, 'index_ready': retriever.ready,
                'index_message': retriever.index_error, 'generation_available': bool(settings.provider_key),
                'consultation_mode': settings.consultation,
                'web_search_enabled': settings.web_enabled,
                'web_available': settings.web_available,
                'model': settings.generation_model, 'embedding_model': settings.effective_embedding_model}

    @app.get('/api/sources/{identifier}')
    async def source(identifier: str):
        if identifier not in app.state.corpus.by_id:
            raise HTTPException(404, 'Source inconnue')
        return app.state.corpus.public_source(identifier)

    @app.get('/api/search')
    async def search(q: str = ''):
        if not 2 <= len(q) <= 2000:
            raise HTTPException(422, 'Recherche entre 2 et 2 000 caractères')
        if not app.state.retriever.ready:
            raise HTTPException(503, app.state.retriever.index_error)
        if app.state.retriever.needs_remote_embeddings and not app.state.client:
            raise HTTPException(503, 'Clé OpenAI nécessaire à la recherche hybride')
        try:
            rows, _ = await app.state.retriever.search(q, app.state.client)
            return {'sources': [app.state.corpus.public_source(r['id']) for r in rows]}
        except APIError:
            raise HTTPException(502, 'Recherche sémantique indisponible') from None

    @app.get('/documents/programme.pdf')
    async def pdf():
        if not settings.pdf_path.is_file():
            raise HTTPException(404, 'PDF indisponible')
        return FileResponse(settings.pdf_path, media_type='application/pdf', content_disposition_type='inline')

    def bearer(request: Request):
        header = request.headers.get('authorization', '')
        return header[7:].strip() if header[:7].lower() == 'bearer ' else None

    async def authorize(request: Request, reserve: bool):
        """Resolve the invitation link of a beta request. Returns a Grant, or raises
        HTTPException(401/429) for an invalid link; QuotaDenied for an exhausted quota."""
        token = bearer(request)
        if not valid_shape(token):
            raise HTTPException(401, QuotaDenied('invalid').message)
        invite_id = hash_token(token)
        if app.state.guard.rejected(invite_id):
            raise HTTPException(401, QuotaDenied('invalid').message)
        if not app.state.guard.allow_lookup(invite_id):
            raise HTTPException(429, 'Trop de tentatives avec un lien invalide. Réessayez dans une minute.')
        try:
            return await (app.state.quota.reserve(invite_id) if reserve else app.state.quota.peek(invite_id))
        except QuotaDenied as denied:
            if denied.code == 'invalid':
                app.state.guard.record_bad(invite_id)
            if denied.code in {'invalid', 'inactive', 'expired'}:
                raise HTTPException(401, denied.message) from None
            raise
        except Exception:
            logger.exception('quota store unavailable')
            raise HTTPException(503, 'Le contrôle des quotas est momentanément indisponible. Réessayez dans un instant.') from None

    @app.get('/api/me')
    async def me(request: Request):
        if not settings.beta_mode:
            return {'beta': False}
        try:
            grant = await authorize(request, reserve=False)
        except QuotaDenied as denied:  # peek never raises exhaustion, kept for completeness
            raise HTTPException(429, denied.message) from None
        return {'beta': True, 'label': grant.label, **grant.public()}

    @app.post('/api/chat')
    async def chat(payload: ChatRequest, request: Request):
        if not app.state.retriever.ready:
            raise HTTPException(503, app.state.retriever.index_error)
        if not settings.provider_key and not settings.consultation:
            raise HTTPException(503, 'Configurez la clé du fournisseur (GROQ_API_KEY ou OPENAI_API_KEY), ou activez explicitement CONSULTATION_MODE pour consulter les textes sans IA.')
        if app.state.retriever.needs_remote_embeddings and not app.state.client:
            raise HTTPException(503, 'Clé OpenAI nécessaire à la recherche hybride')
        if payload.research and not settings.web_available:
            raise HTTPException(503, 'La recherche web n’est pas disponible dans cette version.')
        if payload.focus_measure_id and (payload.focus_measure_id not in app.state.corpus.by_id or app.state.corpus.by_id[payload.focus_measure_id]['type'] != 'mesure'):
            raise HTTPException(404, 'Mesure de suivi inconnue')
        grant, denied_quota = None, None
        if settings.beta_mode and not settings.consultation:
            try:
                grant = await authorize(request, reserve=True)
            except QuotaDenied as denied:
                denied_quota = denied  # quota used up: the texts stay consultable, with no generation
        identifier = str(uuid.uuid4())

        def event(kind, data):
            return f"event: {kind}\ndata: {json.dumps({'request_id': identifier, **data}, ensure_ascii=False)}\n\n"

        async def stream():
            start = time.monotonic()
            counter = [0]
            TOKEN_COUNTER.set(counter)
            delivered = False
            try:
                async with asyncio.timeout(2):
                    await app.state.semaphore.acquire()
            except TimeoutError:
                if grant:
                    await settle(grant, counter, delivered)
                yield event('error', {'message': 'Chati traite déjà plusieurs demandes. Réessayez dans un instant.'})
                return
            try:
                yield event('status', {'stage': 'searching', 'label': 'Recherche dans le programme…'})
                async with asyncio.timeout(settings.timeout * 3):
                    consult = settings.consultation or denied_quota is not None
                    # The previous user turn resolves common anaphoric follow-ups;
                    # it is retrieval context, never an authoritative source.
                    full = settings.context_mode == 'full' and not payload.research and not consult
                    if full:
                        rows, retrieved_ids = app.state.corpus.rows, []
                    else:
                        query = query_for_messages(payload.messages)
                        extra, planner_usage = [], None
                        if settings.query_planning and not consult:
                            try:
                                extra, planner_usage = await plan_queries(app.state.client, settings.generation_model, payload.messages)
                            except (APIError, TimeoutError, ValueError, LLMBusy):
                                logger.warning('request=%s query planning failed; single query used', identifier)
                        rows, retrieved_ids = await app.state.retriever.search(query, app.state.client, extra_queries=extra)
                    if payload.focus_measure_id and not full:
                        # The measure behind the clicked question is authoritative;
                        # do not replace it with a similarly worded search result.
                        rows = app.state.corpus.expand([payload.focus_measure_id] + [r['id'] for r in rows])
                    if await request.is_disconnected():
                        return
                    web_rows, web_context, research_usage, verification = [], None, None, None
                    if payload.research:
                        yield event('status', {'stage': 'researching', 'label': 'Recherche de sources actuelles sur Internet…'})
                        web_rows, web_context, research_usage = await research_web(app.state.client, settings.generation_model,
                            payload.messages, rows, max_calls=settings.web_max_calls)
                    if consult:
                        answer, usage = consultation_answer(rows, denied_quota.message if denied_quota else None), None
                        selected = rows[:4]
                    else:
                        yield event('status', {'stage': 'generating', 'label': 'Rédaction à partir des sources…'})
                        if full:
                            answer, usage = await generate_full(app.state.client, settings.generation_model, payload.messages, app.state.corpus, payload.focus_measure_id)
                        elif payload.research:
                            answer, usage = await generate(app.state.client, settings.generation_model, payload.messages, rows + web_rows, web_context=web_context)
                        else:
                            answer, usage = await generate(app.state.client, settings.generation_model, payload.messages, rows)
                            if settings.verify_absence:
                                try:
                                    answer, usage, verification, rows = await verify_absences(app.state.client, settings.generation_model,
                                        app.state.retriever, app.state.corpus, payload.messages, rows, answer, usage)
                                except (APIError, TimeoutError, LLMBusy):
                                    logger.warning('request=%s absence check failed; first answer kept', identifier)
                        selected = rows
                    yield event('status', {'stage': 'verifying', 'label': 'Vérification des références…'})
                    cited = list(dict.fromkeys([s for b in answer.blocks for s in b.source_ids] + [m.id for m in answer.measures]))
                    web_by_id = {r['id']: r for r in web_rows}
                    sources = [public_web_source(web_by_id[i], app.state.corpus.version) if i in web_by_id else app.state.corpus.public_source(i) for i in cited]
                    quota = None
                    if grant:
                        quota = grant.public()
                    elif denied_quota is not None and denied_quota.grant is not None:
                        quota = denied_quota.grant.public(exhausted=True, reason=denied_quota.code)
                    result = {'request_id': identifier, 'corpus_version': app.state.corpus.version,
                              **answer.model_dump(), 'sources': sources, 'retrieved_ids': retrieved_ids,
                              'context_ids': [r['id'] for r in selected] if not full else [], 'context_mode': 'full' if full else 'retrieval',
                              'verification': None if full else verification,
                              'search_queries': [] if full else [query, *extra], 'planner_usage': None if full else planner_usage,
                              'mode': 'consultation' if consult else 'generated',
                              'model': None if consult else settings.generation_model,
                              'quota': quota,
                              'followups': suggest_followups(answer, selected, payload.focus_measure_id),
                              'research': payload.research, 'research_usage': research_usage,
                              'usage': usage, 'latency_ms': round((time.monotonic() - start) * 1000)}
                    yield event('answer', result)
                    delivered = True
                    yield event('done', {})
                    logger.info('request=%s mode=%s latency_ms=%s source_count=%s', identifier, result['mode'], result['latency_ms'], len(sources))
            except WebResearchError:
                yield event('error', {'message': 'La recherche web n’a pas fourni de références exploitables. La situation actuelle ne peut pas être confirmée. Vous pouvez réessayer.'})
            except LLMBusy as busy:
                yield event('error', {'message': f'Le service gratuit est très sollicité. Réessayez dans {busy.retry_after} secondes : cette question ne compte pas dans votre quota.'})
            except RateLimitError:
                yield event('error', {'message': 'La capacité gratuite du fournisseur est momentanément atteinte. Réessayez un peu plus tard : cette question ne compte pas dans votre quota.'})
            except (TimeoutError, APIError):
                label = 'La recherche web est indisponible ou a dépassé le délai. Aucune comparaison actuelle n’a pu être vérifiée.' if payload.research else 'Le service de génération est indisponible ou a dépassé le délai. Vous pouvez réessayer.'
                yield event('error', {'message': label})
            except ValueError:
                yield event('error', {'message': 'La réponse n’a pas satisfait le contrôle des références. Réessayez ou reformulez la question.'})
            finally:
                app.state.semaphore.release()
                if grant:
                    await settle(grant, counter, delivered)

        async def settle(grant, counter, delivered):
            """Count the tokens actually used; give the question back if no answer was delivered."""
            try:
                if counter[0]:
                    await app.state.quota.commit_tokens(grant, counter[0])
                if not delivered:
                    await app.state.quota.release(grant)
            except Exception:  # accounting must never break a response
                logger.exception('quota settlement failed')

        return StreamingResponse(stream(), media_type='text/event-stream', headers={'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no'})

    if settings.static_dir.is_dir():
        app.mount('/', StaticFiles(directory=settings.static_dir, html=True), name='frontend')
    return app


app = create_app()
