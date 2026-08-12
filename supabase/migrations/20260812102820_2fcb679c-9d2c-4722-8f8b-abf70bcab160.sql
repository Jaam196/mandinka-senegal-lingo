-- =============== community translations ===============
CREATE TABLE public.community_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text text NOT NULL,
  source_normalized text NOT NULL,
  source_lang text NOT NULL,
  translation text NOT NULL,
  target_lang text NOT NULL,
  pronunciation text,
  notes text,
  created_by_device text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by_device text,
  updated_by_name text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  current_version_id uuid,
  version_number integer NOT NULL DEFAULT 1,
  CONSTRAINT community_translations_unique_pair UNIQUE (source_normalized, source_lang, target_lang)
);

CREATE TABLE public.translation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id uuid NOT NULL REFERENCES public.community_translations(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  source_text text NOT NULL,
  translation text NOT NULL,
  pronunciation text,
  notes text,
  device_id text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  change_type text NOT NULL DEFAULT 'update',
  reverted_from_version_id uuid REFERENCES public.translation_versions(id) ON DELETE SET NULL,
  CONSTRAINT translation_versions_unique UNIQUE (translation_id, version_number)
);

CREATE TABLE public.translation_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_version_id uuid NOT NULL REFERENCES public.translation_versions(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  display_name text,
  confirmed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT translation_confirmations_one_vote UNIQUE (translation_version_id, device_id)
);

ALTER TABLE public.community_translations
  ADD CONSTRAINT community_translations_current_version_fkey
  FOREIGN KEY (current_version_id) REFERENCES public.translation_versions(id) ON DELETE SET NULL;

CREATE INDEX community_translations_lookup_idx
  ON public.community_translations (source_lang, target_lang, source_normalized);
CREATE INDEX community_translations_updated_idx ON public.community_translations (updated_at DESC);
CREATE INDEX translation_versions_translation_idx
  ON public.translation_versions (translation_id, version_number DESC);
CREATE INDEX translation_versions_created_idx ON public.translation_versions (created_at DESC);
CREATE INDEX translation_confirmations_version_idx
  ON public.translation_confirmations (translation_version_id);

-- =============== grants: read only; writes go through SECURITY DEFINER RPCs ===============
GRANT SELECT ON public.community_translations TO anon, authenticated;
GRANT SELECT ON public.translation_versions TO anon, authenticated;
GRANT SELECT ON public.translation_confirmations TO anon, authenticated;
GRANT ALL ON public.community_translations TO service_role;
GRANT ALL ON public.translation_versions TO service_role;
GRANT ALL ON public.translation_confirmations TO service_role;

ALTER TABLE public.community_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community translations are public"
  ON public.community_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Translation versions are public"
  ON public.translation_versions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Translation confirmations are public"
  ON public.translation_confirmations FOR SELECT TO anon, authenticated USING (true);

-- =============== write API ===============
CREATE OR REPLACE FUNCTION public.save_community_translation(
  _source_text text,
  _source_lang text,
  _target_lang text,
  _translation text,
  _pronunciation text,
  _notes text,
  _device_id text,
  _display_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text := public.normalize_term(_source_text);
  _row public.community_translations%ROWTYPE;
  _version_id uuid;
  _next integer;
  _type text;
BEGIN
  IF coalesce(btrim(_source_text), '') = '' OR coalesce(btrim(_translation), '') = '' THEN
    RAISE EXCEPTION 'El texto original y la traducción son obligatorios';
  END IF;
  IF coalesce(btrim(_device_id), '') = '' THEN
    RAISE EXCEPTION 'Falta el identificador de dispositivo';
  END IF;
  IF length(_source_text) > 600 OR length(_translation) > 600
     OR length(coalesce(_pronunciation, '')) > 600 OR length(coalesce(_notes, '')) > 1000
     OR length(coalesce(_display_name, '')) > 80 OR length(_device_id) > 80
     OR length(_source_lang) > 12 OR length(_target_lang) > 12 THEN
    RAISE EXCEPTION 'Contenido demasiado largo';
  END IF;
  IF _source_lang = _target_lang THEN
    RAISE EXCEPTION 'Los idiomas deben ser distintos';
  END IF;

  SELECT * INTO _row FROM public.community_translations
   WHERE source_normalized = _norm AND source_lang = _source_lang AND target_lang = _target_lang
   FOR UPDATE;

  IF _row.id IS NULL THEN
    INSERT INTO public.community_translations (
      source_text, source_normalized, source_lang, translation, target_lang,
      pronunciation, notes, created_by_device, created_by_name,
      updated_by_device, updated_by_name, version_number
    ) VALUES (
      btrim(_source_text), _norm, _source_lang, btrim(_translation), _target_lang,
      nullif(btrim(coalesce(_pronunciation, '')), ''), nullif(btrim(coalesce(_notes, '')), ''),
      _device_id, _display_name, _device_id, _display_name, 1
    ) RETURNING * INTO _row;
    _next := 1;
    _type := 'create';
  ELSE
    _next := _row.version_number + 1;
    _type := 'update';
    UPDATE public.community_translations SET
      source_text = btrim(_source_text),
      translation = btrim(_translation),
      pronunciation = nullif(btrim(coalesce(_pronunciation, '')), ''),
      notes = nullif(btrim(coalesce(_notes, '')), ''),
      updated_by_device = _device_id,
      updated_by_name = _display_name,
      updated_at = now(),
      version_number = _next
    WHERE id = _row.id
    RETURNING * INTO _row;
  END IF;

  INSERT INTO public.translation_versions (
    translation_id, version_number, source_text, translation, pronunciation, notes,
    device_id, display_name, change_type
  ) VALUES (
    _row.id, _next, _row.source_text, _row.translation, _row.pronunciation, _row.notes,
    _device_id, _display_name, _type
  ) RETURNING id INTO _version_id;

  UPDATE public.community_translations SET current_version_id = _version_id WHERE id = _row.id;
  RETURN _row.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_translation_version(
  _version_id uuid,
  _device_id text,
  _display_name text,
  _confirmed boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(btrim(_device_id), '') = '' OR length(_device_id) > 80 THEN
    RAISE EXCEPTION 'Identificador de dispositivo no válido';
  END IF;
  INSERT INTO public.translation_confirmations (translation_version_id, device_id, display_name, confirmed)
  VALUES (_version_id, _device_id, left(coalesce(_display_name, ''), 80), _confirmed)
  ON CONFLICT (translation_version_id, device_id)
  DO UPDATE SET confirmed = EXCLUDED.confirmed,
                display_name = EXCLUDED.display_name,
                created_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_translation_version(
  _version_id uuid,
  _device_id text,
  _display_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old public.translation_versions%ROWTYPE;
  _row public.community_translations%ROWTYPE;
  _next integer;
  _new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede revertir versiones';
  END IF;

  SELECT * INTO _old FROM public.translation_versions WHERE id = _version_id;
  IF _old.id IS NULL THEN RAISE EXCEPTION 'Versión no encontrada'; END IF;

  SELECT * INTO _row FROM public.community_translations WHERE id = _old.translation_id FOR UPDATE;
  _next := _row.version_number + 1;

  UPDATE public.community_translations SET
    source_text = _old.source_text,
    translation = _old.translation,
    pronunciation = _old.pronunciation,
    notes = _old.notes,
    updated_by_device = coalesce(_device_id, 'admin'),
    updated_by_name = coalesce(_display_name, 'Administración'),
    updated_at = now(),
    version_number = _next
  WHERE id = _row.id;

  INSERT INTO public.translation_versions (
    translation_id, version_number, source_text, translation, pronunciation, notes,
    device_id, display_name, change_type, reverted_from_version_id
  ) VALUES (
    _row.id, _next, _old.source_text, _old.translation, _old.pronunciation, _old.notes,
    coalesce(_device_id, 'admin'), coalesce(_display_name, 'Administración'), 'revert', _old.id
  ) RETURNING id INTO _new_id;

  UPDATE public.community_translations SET current_version_id = _new_id WHERE id = _row.id;
  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_community_translation(text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_translation_version(uuid, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revert_translation_version(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_community_translation(text, text, text, text, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_translation_version(uuid, text, text, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revert_translation_version(uuid, text, text) TO authenticated, service_role;