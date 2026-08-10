-- 1. LANGUAGES
CREATE TABLE public.languages (
  code text PRIMARY KEY,
  name text NOT NULL,
  native_name text,
  flag text NOT NULL DEFAULT '🌍',
  region text,
  family text,
  tts_supported boolean NOT NULL DEFAULT false,
  tts_locale text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.languages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.languages TO authenticated;
GRANT ALL ON public.languages TO service_role;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Languages are public" ON public.languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage languages" ON public.languages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. NORMALIZATION HELPER (accent/case/punctuation insensitive search)
CREATE OR REPLACE FUNCTION public.normalize_term(_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    regexp_replace(
      lower(translate(coalesce(_text, ''),
        'áàâäãåéèêëíìîïóòôöõúùûüñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇŋŊɲƝɛƐɔƆ',
        'aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuuncnnnneeoo')),
      '[^a-z0-9 ]', '', 'g'),
    '\s+', ' ', 'g')
$$;

-- 3. CONCEPTS
CREATE TABLE public.concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'word' CHECK (kind IN ('word', 'phrase')),
  category_slug text REFERENCES public.categories(slug),
  gloss_es text NOT NULL,
  gloss_en text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.concepts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concepts TO authenticated;
GRANT ALL ON public.concepts TO service_role;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Concepts are public" ON public.concepts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage concepts" ON public.concepts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER concepts_updated_at BEFORE UPDATE ON public.concepts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. TERMS
CREATE TABLE public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES public.languages(code),
  text text NOT NULL,
  normalized text GENERATED ALWAYS AS (public.normalize_term(text)) STORED,
  pronunciation text,
  ipa text,
  part_of_speech text,
  example_text text,
  example_translation text,
  synonyms text[] NOT NULL DEFAULT '{}',
  alternative_meanings text[] NOT NULL DEFAULT '{}',
  region text,
  source_name text,
  source_url text,
  source_type text,
  source_date date,
  confidence text NOT NULL DEFAULT 'unverified'
    CHECK (confidence IN ('verified', 'high_confidence', 'approximate', 'unverified', 'rejected')),
  verified boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX terms_normalized_idx ON public.terms (normalized);
CREATE INDEX terms_language_idx ON public.terms (language_code);
CREATE INDEX terms_concept_idx ON public.terms (concept_id);
GRANT SELECT ON public.terms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms TO authenticated;
GRANT ALL ON public.terms TO service_role;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Terms are public" ON public.terms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage terms" ON public.terms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER terms_updated_at BEFORE UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. TERM REVISIONS (never lose previous linguistic information)
CREATE TABLE public.term_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid REFERENCES public.terms(id) ON DELETE SET NULL,
  changed_by uuid,
  change_type text NOT NULL DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'delete')),
  previous jsonb,
  next jsonb,
  reason text,
  source_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.term_revisions TO anon;
GRANT SELECT, INSERT ON public.term_revisions TO authenticated;
GRANT ALL ON public.term_revisions TO service_role;
ALTER TABLE public.term_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Revisions are public" ON public.term_revisions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write revisions" ON public.term_revisions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_term_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.term_revisions (term_id, changed_by, change_type, next)
    VALUES (NEW.id, auth.uid(), 'create', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.term_revisions (term_id, changed_by, change_type, previous, next)
    VALUES (NEW.id, auth.uid(), 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO public.term_revisions (term_id, changed_by, change_type, previous)
    VALUES (OLD.id, auth.uid(), 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER terms_revision_log
  AFTER INSERT OR UPDATE OR DELETE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.log_term_revision();

-- 6. AUDIO CACHE
CREATE TABLE public.audio_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  text text NOT NULL,
  language_code text,
  speed text NOT NULL DEFAULT 'normal' CHECK (speed IN ('normal', 'slow')),
  provider text NOT NULL,
  voice text,
  mime_type text NOT NULL DEFAULT 'audio/mpeg',
  byte_size integer NOT NULL DEFAULT 0,
  data_base64 text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audio_cache TO anon;
GRANT SELECT ON public.audio_cache TO authenticated;
GRANT ALL ON public.audio_cache TO service_role;
ALTER TABLE public.audio_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audio cache is public" ON public.audio_cache FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage audio cache" ON public.audio_cache FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. UNKNOWN WORDS
CREATE TABLE public.unknown_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  normalized text NOT NULL,
  language_code text,
  search_count integer NOT NULL DEFAULT 1,
  priority integer NOT NULL DEFAULT 1,
  resolved boolean NOT NULL DEFAULT false,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (normalized, language_code)
);
GRANT SELECT, UPDATE, DELETE ON public.unknown_words TO authenticated;
GRANT ALL ON public.unknown_words TO service_role;
ALTER TABLE public.unknown_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read unknown words" ON public.unknown_words FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage unknown words" ON public.unknown_words FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_unknown_word(_text text, _language_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text := public.normalize_term(_text);
BEGIN
  IF _norm = '' OR length(_norm) > 200 THEN RETURN; END IF;
  INSERT INTO public.unknown_words (text, normalized, language_code)
  VALUES (left(_text, 200), _norm, _language_code)
  ON CONFLICT (normalized, language_code) DO UPDATE
    SET search_count = public.unknown_words.search_count + 1,
        last_seen = now(),
        priority = LEAST(100, public.unknown_words.search_count + 1);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_unknown_word(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_unknown_word(text, text) TO anon, authenticated, service_role;

-- 8. LANGUAGE CATALOG
INSERT INTO public.languages (code, name, native_name, flag, region, family, tts_supported, tts_locale, sort_order) VALUES
  ('es',     'Español',                    'Español',  '🇪🇸', 'España',        'Indoeuropea', true,  'es', 1),
  ('en',     'Inglés',                     'English',  '🇬🇧', 'Reino Unido',   'Indoeuropea', true,  'en', 2),
  ('mnk-sn', 'Mandinka de Senegal',        'Mandinka', '🇸🇳', 'Senegal',       'Mandé',       false, NULL, 3),
  ('mnk-gm', 'Mandinka de Gambia',         'Mandinka', '🇬🇲', 'Gambia',        'Mandé',       false, NULL, 4),
  ('mnk-gw', 'Mandinka de Guinea-Bisáu',   'Mandinka', '🇬🇼', 'Guinea-Bisáu',  'Mandé',       false, NULL, 5),
  ('bm',     'Bambara',                    'Bamanankan','🇲🇱','Malí',          'Mandé',       false, NULL, 6),
  ('wo',     'Wolof',                      'Wolof',    '🇸🇳', 'Senegal',       'Atlántica',   false, NULL, 7),
  ('man',    'Malinké',                    'Maninkakan','🇬🇳','Guinea',        'Mandé',       false, NULL, 8);

-- 9. MIGRATE EXISTING SENEGAL MANDINKA DICTIONARY INTO THE NEW STRUCTURE
INSERT INTO public.concepts (slug, kind, category_slug, gloss_es, notes)
SELECT 'w-' || d.id::text, 'word', d.category_slug, d.spanish, d.notes
FROM public.dictionary_entries d;

INSERT INTO public.terms (concept_id, language_code, text, pronunciation, ipa, example_text, example_translation,
                          synonyms, alternative_meanings, region, source_name, source_url, source_type, source_date,
                          confidence, verified, notes)
SELECT c.id, 'mnk-sn', d.mandinka, d.pronunciation, d.ipa, d.example_mandinka, d.example_spanish,
       d.synonyms, d.alternative_meanings, d.region, d.source_name, d.source_url, d.source_type, d.source_date,
       CASE d.confidence::text WHEN 'verified' THEN 'verified' WHEN 'probable' THEN 'high_confidence' ELSE 'approximate' END,
       d.verified, d.notes
FROM public.dictionary_entries d
JOIN public.concepts c ON c.slug = 'w-' || d.id::text;

INSERT INTO public.terms (concept_id, language_code, text, region, source_name, confidence, verified)
SELECT c.id, 'es', d.spanish, 'España', 'Base propia', 'verified', true
FROM public.dictionary_entries d
JOIN public.concepts c ON c.slug = 'w-' || d.id::text;

INSERT INTO public.concepts (slug, kind, category_slug, gloss_es)
SELECT 'p-' || p.id::text, 'phrase', p.category_slug, p.spanish
FROM public.phrases p;

INSERT INTO public.terms (concept_id, language_code, text, pronunciation, region, source_name, confidence, verified)
SELECT c.id, 'mnk-sn', p.mandinka, p.pronunciation, p.region, p.source_name,
       CASE p.confidence::text WHEN 'verified' THEN 'verified' WHEN 'probable' THEN 'high_confidence' ELSE 'approximate' END,
       p.confidence::text = 'verified'
FROM public.phrases p
JOIN public.concepts c ON c.slug = 'p-' || p.id::text;

INSERT INTO public.terms (concept_id, language_code, text, region, source_name, confidence, verified)
SELECT c.id, 'es', p.spanish, 'España', 'Base propia', 'verified', true
FROM public.phrases p
JOIN public.concepts c ON c.slug = 'p-' || p.id::text;

-- 10. MINIMAL DOCUMENTED SEED FOR THE OTHER LANGUAGES
CREATE TEMP TABLE seed_rows (
  slug text, kind text, category_slug text, gloss_es text, gloss_en text,
  lang text, txt text, pron text, conf text, verified boolean, src text
) ON COMMIT DROP;

INSERT INTO seed_rows (slug, kind, category_slug, gloss_es, gloss_en, lang, txt, pron, conf, verified, src) VALUES
-- agua
('core-agua','word','naturaleza','agua','water','es','agua','a-gua','verified',true,'Base propia'),
('core-agua','word','naturaleza','agua','water','en','water','uó-ter','verified',true,'Base propia'),
('core-agua','word','naturaleza','agua','water','mnk-sn','jiyo','yí-yo','high_confidence',false,'Léxico mandinka documentado'),
('core-agua','word','naturaleza','agua','water','mnk-gm','jiyo','yí-yo','high_confidence',false,'Léxico mandinka documentado'),
('core-agua','word','naturaleza','agua','water','mnk-gw','jiyo','yí-yo','approximate',false,'Variante no confirmada localmente'),
('core-agua','word','naturaleza','agua','water','bm','ji','yi','high_confidence',false,'Léxico bambara documentado'),
('core-agua','word','naturaleza','agua','water','wo','ndox','ndoj','high_confidence',false,'Léxico wolof documentado'),
('core-agua','word','naturaleza','agua','water','man','ji','yi','approximate',false,'Cercano al bambara; sin confirmar'),
-- arroz
('core-arroz','word','comida','arroz','rice','es','arroz','a-rroz','verified',true,'Base propia'),
('core-arroz','word','comida','arroz','rice','en','rice','ráis','verified',true,'Base propia'),
('core-arroz','word','comida','arroz','rice','mnk-sn','kiniŋo','quí-ni-ngo','high_confidence',false,'Léxico mandinka documentado'),
('core-arroz','word','comida','arroz','rice','mnk-gm','kinoo','quí-noo','high_confidence',false,'Léxico mandinka documentado'),
('core-arroz','word','comida','arroz','rice','bm','malo','má-lo','high_confidence',false,'Léxico bambara documentado'),
('core-arroz','word','comida','arroz','rice','wo','ceeb','chéeb','high_confidence',false,'Léxico wolof documentado'),
('core-arroz','word','comida','arroz','rice','man','malo','má-lo','approximate',false,'Sin confirmar'),
-- gracias
('core-gracias','phrase','saludos','gracias','thank you','es','gracias','grá-cias','verified',true,'Base propia'),
('core-gracias','phrase','saludos','gracias','thank you','en','thank you','zánk-iu','verified',true,'Base propia'),
('core-gracias','phrase','saludos','gracias','thank you','mnk-sn','abaraka','a-bá-ra-ka','high_confidence',false,'Uso corriente documentado'),
('core-gracias','phrase','saludos','gracias','thank you','mnk-gm','abaraka','a-bá-ra-ka','high_confidence',false,'Uso corriente documentado'),
('core-gracias','phrase','saludos','gracias','thank you','bm','i ni ce','i ni ché','high_confidence',false,'Fórmula bambara documentada'),
('core-gracias','phrase','saludos','gracias','thank you','wo','jërëjëf','ye-re-yéf','high_confidence',false,'Fórmula wolof documentada'),
('core-gracias','phrase','saludos','gracias','thank you','man','i ni ce','i ni ché','approximate',false,'Sin confirmar'),
-- sí
('core-si','word','conversacion','sí','yes','es','sí','si','verified',true,'Base propia'),
('core-si','word','conversacion','sí','yes','en','yes','yes','verified',true,'Base propia'),
('core-si','word','conversacion','sí','yes','mnk-sn','haa','ja','high_confidence',false,'Léxico mandinka documentado'),
('core-si','word','conversacion','sí','yes','mnk-gm','haa','ja','high_confidence',false,'Léxico mandinka documentado'),
('core-si','word','conversacion','sí','yes','bm','ɔwɔ','o-uó','high_confidence',false,'Léxico bambara documentado'),
('core-si','word','conversacion','sí','yes','wo','waaw','uáau','high_confidence',false,'Léxico wolof documentado'),
-- no
('core-no','word','conversacion','no','no','es','no','no','verified',true,'Base propia'),
('core-no','word','conversacion','no','no','en','no','nou','verified',true,'Base propia'),
('core-no','word','conversacion','no','no','mnk-sn','hani','já-ni','high_confidence',false,'Léxico mandinka documentado'),
('core-no','word','conversacion','no','no','mnk-gm','hani','já-ni','high_confidence',false,'Léxico mandinka documentado'),
('core-no','word','conversacion','no','no','bm','ayi','a-yí','high_confidence',false,'Léxico bambara documentado'),
('core-no','word','conversacion','no','no','wo','déedéet','dée-déet','high_confidence',false,'Léxico wolof documentado'),
-- hola / saludo
('core-hola','phrase','saludos','la paz sea contigo (saludo)','peace be upon you (greeting)','es','hola','o-la','verified',true,'Base propia'),
('core-hola','phrase','saludos','la paz sea contigo (saludo)','peace be upon you (greeting)','en','hello','je-lóu','verified',true,'Base propia'),
('core-hola','phrase','saludos','la paz sea contigo (saludo)','peace be upon you (greeting)','mnk-sn','i be ñaadi','i be ñáa-di','high_confidence',false,'Saludo mandinka documentado'),
('core-hola','phrase','saludos','la paz sea contigo (saludo)','peace be upon you (greeting)','mnk-gm','kori tanante','kó-ri ta-nán-te','approximate',false,'Variante regional sin confirmar'),
('core-hola','phrase','saludos','la paz sea contigo (saludo)','peace be upon you (greeting)','bm','i ni sɔgɔma','i ni só-go-ma','high_confidence',false,'Saludo bambara (mañana)'),
('core-hola','phrase','saludos','la paz sea contigo (saludo)','peace be upon you (greeting)','wo','salaam aleekum','sa-lám a-lé-kum','high_confidence',false,'Saludo wolof documentado'),
-- comida
('core-comida','word','comida','comida','food','es','comida','co-mí-da','verified',true,'Base propia'),
('core-comida','word','comida','comida','food','en','food','fuud','verified',true,'Base propia'),
('core-comida','word','comida','comida','food','mnk-sn','domoroo','do-mó-roo','high_confidence',false,'Léxico mandinka documentado'),
('core-comida','word','comida','comida','food','bm','dumuni','du-mú-ni','high_confidence',false,'Léxico bambara documentado'),
('core-comida','word','comida','comida','food','wo','lekk','lek','high_confidence',false,'Verbo/nombre wolof documentado'),
-- mercado
('core-mercado','word','compras','mercado','market','es','mercado','mer-cá-do','verified',true,'Base propia'),
('core-mercado','word','compras','mercado','market','en','market','már-ket','verified',true,'Base propia'),
('core-mercado','word','compras','mercado','market','mnk-sn','marisewo','ma-ri-sé-wo','approximate',false,'Préstamo adaptado, sin confirmar'),
('core-mercado','word','compras','mercado','market','bm','sugu','sú-gu','high_confidence',false,'Léxico bambara documentado'),
('core-mercado','word','compras','mercado','market','wo','marse','már-se','high_confidence',false,'Préstamo del francés documentado'),
-- dinero
('core-dinero','word','dinero','dinero','money','es','dinero','di-né-ro','verified',true,'Base propia'),
('core-dinero','word','dinero','dinero','money','en','money','má-ni','verified',true,'Base propia'),
('core-dinero','word','dinero','dinero','money','mnk-sn','kodoo','có-doo','high_confidence',false,'Léxico mandinka documentado'),
('core-dinero','word','dinero','dinero','money','bm','wari','uá-ri','high_confidence',false,'Léxico bambara documentado'),
('core-dinero','word','dinero','dinero','money','wo','xaalis','jáa-lis','high_confidence',false,'Léxico wolof documentado');

INSERT INTO public.concepts (slug, kind, category_slug, gloss_es, gloss_en)
SELECT DISTINCT ON (s.slug) s.slug, s.kind,
  (SELECT c.slug FROM public.categories c WHERE c.slug = s.category_slug), s.gloss_es, s.gloss_en
FROM seed_rows s
WHERE NOT EXISTS (SELECT 1 FROM public.concepts c WHERE c.slug = s.slug);

INSERT INTO public.terms (concept_id, language_code, text, pronunciation, confidence, verified, source_name, region)
SELECT c.id, s.lang, s.txt, s.pron, s.conf, s.verified, s.src, l.region
FROM seed_rows s
JOIN public.concepts c ON c.slug = s.slug
JOIN public.languages l ON l.code = s.lang;