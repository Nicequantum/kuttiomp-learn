# Backend implementation notes (Kuttiomp monorepo)

Copy this file into `Nicequantum/Kuttiomp/docs/` when implementing.

Companion contract: [PUBLIC_LEXICON_CONTRACT.md](./PUBLIC_LEXICON_CONTRACT.md)

## Suggested FastAPI routes

```
apps/api/app/routers/public_lexicon.py
```

```python
# Pseudocode — align with existing supabase client patterns in apps/api

@router.get("/api/v1/public/health")
async def public_health(): ...

@router.get("/api/v1/public/lexicon")
async def public_lexicon(limit=100, offset=0, domain=None, q=None):
    # SELECT from lexical_entries
    # WHERE visibility = 'public'
    #   AND approval_status = 'approved'
    #   AND spiritual/sacred flags not restricted
    # JOIN speakers for attribution
    # LEFT JOIN approved audio
    ...

@router.get("/api/v1/public/lexicon/{entry_id}")
async def public_entry(entry_id):
    # same gate; 404 if not publishable
    ...
```

## SQL filter (illustrative)

```sql
SELECT e.*, s.display_name AS speaker_name, s.role AS speaker_role
FROM lexical_entries e
LEFT JOIN speakers s ON s.id = e.primary_speaker_id
WHERE e.visibility = 'public'
  AND e.approval_status = 'approved'
  -- add: exclude sacred categories / spiritual_significance restricted
ORDER BY e.updated_at DESC;
```

## CORS

Allow origins:

- `https://kuttiomp-learn.vercel.app`
- Local: `http://localhost:8080` (Learn dev)
- Optional: Vercel preview pattern

Methods: `GET`, `OPTIONS`  
Headers: `Content-Type`, `Accept`

## Response mapping helper

```python
def to_public_word(row) -> dict:
    return {
        "id": str(row["id"]),
        "wordNarragansett": row["word_narragansett"],
        "wordNormalized": row.get("word_normalized"),
        "englishGloss": row["english_gloss"],
        "category": row.get("category"),
        "semanticDomain": row.get("semantic_domain") or "other",
        "seasonalUsage": row.get("seasonal_usage") or [],
        "isPhrase": row.get("category") in ("phrase", "proverb"),
        "orthographyNote": row.get("orthography_notes") or "",
        "speakerAttribution": format_speaker(row),
        "speakerId": str(row["primary_speaker_id"]) if row.get("primary_speaker_id") else None,
        "speakerRole": row.get("speaker_role"),
        "elderApproved": True,
        "isSacred": False,
        "source": "keeper_approved",
        "authority": "living_speaker",
        "primaryAudio": audio_payload(row) or None,
        "updatedAt": row["updated_at"].isoformat() if row.get("updated_at") else None,
    }
```

## Admin UX suggestion

Add a single Keeper action:

**“Publish for learners”**

- Sets `visibility = public`
- Sets `approval_status = approved`
- Requires speaker attribution + non-empty gloss
- Blocks if sacred / restricted

## Do not

- Do not put service role keys in the Learn frontend
- Do not return pending drafts to public routes
- Do not require Vercel SSO on public API
