
CREATE TYPE public.app_role AS ENUM ('admin','editor','user');
CREATE TYPE public.confidence_level AS ENUM ('verified','probable','approximate');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '📚',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.dictionary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandinka text NOT NULL,
  mandinka_normalized text GENERATED ALWAYS AS (lower(mandinka)) STORED,
  spanish text NOT NULL,
  spanish_normalized text GENERATED ALWAYS AS (lower(spanish)) STORED,
  pronunciation text,
  ipa text,
  category_slug text REFERENCES public.categories(slug) ON UPDATE CASCADE,
  alternative_meanings text[] NOT NULL DEFAULT '{}',
  synonyms text[] NOT NULL DEFAULT '{}',
  example_mandinka text,
  example_spanish text,
  region text NOT NULL DEFAULT 'senegal',
  language text NOT NULL DEFAULT 'mandinka',
  regional_variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_name text,
  source_url text,
  source_type text,
  source_date date,
  confidence public.confidence_level NOT NULL DEFAULT 'probable',
  verified boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dictionary_mandinka_idx ON public.dictionary_entries (mandinka_normalized);
CREATE INDEX dictionary_spanish_idx ON public.dictionary_entries (spanish_normalized);
GRANT SELECT ON public.dictionary_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.dictionary_entries TO authenticated;
GRANT ALL ON public.dictionary_entries TO service_role;
ALTER TABLE public.dictionary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dictionary is public" ON public.dictionary_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage dictionary" ON public.dictionary_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spanish text NOT NULL,
  mandinka text NOT NULL,
  pronunciation text,
  category_slug text REFERENCES public.categories(slug) ON UPDATE CASCADE,
  region text NOT NULL DEFAULT 'senegal',
  source_name text,
  confidence public.confidence_level NOT NULL DEFAULT 'probable',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.phrases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.phrases TO authenticated;
GRANT ALL ON public.phrases TO service_role;
ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Phrases are public" ON public.phrases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage phrases" ON public.phrases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER dictionary_updated_at BEFORE UPDATE ON public.dictionary_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.categories (slug,name,emoji,sort_order) VALUES
 ('saludos','Saludos','👋',1),
 ('familia','Familia','👨‍👩‍👧',2),
 ('comida','Comida','🍚',3),
 ('casa','Casa','🏠',4),
 ('ropa','Ropa','👕',5),
 ('cuerpo','Cuerpo','🧍',6),
 ('sentimientos','Sentimientos','❤️',7),
 ('conversacion','Conversación','🗣️',8),
 ('verbos','Verbos','🏃',9),
 ('numeros','Números','🔢',10),
 ('tiempo','Tiempo','📅',11),
 ('clima','Clima','🌦️',12),
 ('animales','Animales','🐄',13),
 ('naturaleza','Naturaleza','🌳',14),
 ('dinero','Dinero','💰',15),
 ('compras','Compras','🛒',16),
 ('salud','Salud','🏥',17),
 ('transporte','Transporte','🚗',18),
 ('lugares','Lugares','📍',19),
 ('trabajo','Trabajo','💼',20),
 ('cultura','Cultura y religión','🕌',21),
 ('amor','Amor','❤️',22),
 ('coloquial','Expresiones coloquiales','😡',23);

INSERT INTO public.dictionary_entries (mandinka,spanish,pronunciation,category_slug,confidence,verified,source_name,source_type,example_mandinka,example_spanish) VALUES
 ('kini','arroz','quí-ni','comida','verified',true,'Diccionario mandinka documentado','diccionario','Kini be jee.','Hay arroz.'),
 ('jiyo','agua','yí-yo','comida','verified',true,'Diccionario mandinka documentado','diccionario','Jiyo dii n na.','Dame agua.'),
 ('mbuuru','pan','mbú-ru','comida','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('suboo','carne','su-bó','comida','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('ñewo','pescado','ñé-uo','comida','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('tiyo','cacahuete','tí-yo','comida','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('nono','leche','nó-no','comida','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('domoroo','comida','do-mo-ró','comida','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('domo','comer','dó-mo','verbos','verified',true,'Diccionario mandinka documentado','diccionario','N ka kini domo.','Como arroz.'),
 ('mii','beber','mí-i','verbos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('taa','ir','tá-a','verbos','verified',true,'Diccionario mandinka documentado','diccionario','N ka taa suu kono.','Voy a casa.'),
 ('naa','venir','ná-a','verbos','verified',true,'Diccionario mandinka documentado','diccionario','Naa jaŋ.','Ven aquí.'),
 ('siyo','sentarse','sí-yo','verbos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('lonna','saber','lón-na','verbos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('fo','decir / hablar','fó','verbos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('je','ver','yé','verbos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('moyi','oír / entender','mó-yi','verbos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('ke','hacer','ké','verbos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('safee','escribir','sa-fé','verbos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('karaŋ','leer / estudiar','ca-ráng','verbos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('suu','casa','sú-u','casa','verified',true,'Diccionario mandinka documentado','diccionario','N na suu.','Mi casa.'),
 ('bunda','puerta','bún-da','casa','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('siiraŋo','silla','sii-rán-go','casa','approximate',false,'Léxico común','materiales educativos',NULL,NULL),
 ('laaraŋo','cama','laa-rán-go','casa','approximate',false,'Léxico común','materiales educativos',NULL,NULL),
 ('faa','padre','fá-a','familia','verified',true,'Diccionario mandinka documentado','diccionario','N faa.','Mi padre.'),
 ('baa','madre','bá-a','familia','verified',true,'Diccionario mandinka documentado','diccionario','N baa.','Mi madre.'),
 ('dindiŋo','niño / niña','din-dín-go','familia','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kotoo','hermano mayor','ko-tó','familia','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('doko','hermano menor','dó-ko','familia','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('musoo','mujer / esposa','mu-só','familia','verified',true,'Diccionario mandinka documentado','diccionario',NULL,NULL),
 ('keo','hombre / marido','ké-o','familia','verified',true,'Diccionario mandinka documentado','diccionario',NULL,NULL),
 ('dimbaayaa','familia','dim-baa-yá','familia','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kuŋo','cabeza','kún-go','cuerpo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('ñaa','ojo','ñá-a','cuerpo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('tuloo','oreja','tu-ló','cuerpo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('daa','boca','dá-a','cuerpo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('buloo','mano / brazo','bu-ló','cuerpo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('siŋo','pie / pierna','sín-go','cuerpo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('konoo','vientre / estómago','ko-nó','cuerpo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kille','uno','quí-lle','numeros','verified',true,'Diccionario mandinka documentado','diccionario',NULL,NULL),
 ('fula','dos','fú-la','numeros','verified',true,'Diccionario mandinka documentado','diccionario',NULL,NULL),
 ('saba','tres','sá-ba','numeros','verified',true,'Diccionario mandinka documentado','diccionario',NULL,NULL),
 ('naani','cuatro','ná-a-ni','numeros','verified',true,'Diccionario mandinka documentado','diccionario',NULL,NULL),
 ('luulu','cinco','lú-u-lu','numeros','verified',true,'Diccionario mandinka documentado','diccionario',NULL,NULL),
 ('woro','seis','uó-ro','numeros','verified',true,'Diccionario mandinka documentado','diccionario',NULL,NULL),
 ('woorowula','siete','uoo-ro-wú-la','numeros','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('sey','ocho','sé-i','numeros','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('konoto','nueve','ko-nó-to','numeros','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('taŋ','diez','táng','numeros','verified',true,'Diccionario mandinka documentado','diccionario',NULL,NULL),
 ('keme','cien','qué-me','numeros','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('luŋo','día','lún-go','tiempo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('suuto','noche','sú-u-to','tiempo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('soomandaa','mañana (parte del día)','soo-man-dá','tiempo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('wulaaroo','tarde','wu-laa-ró','tiempo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('saayiŋ','ahora','saa-yíng','tiempo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('sinaŋ','mañana (día siguiente)','si-náng','tiempo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('tili','sol / día','tí-li','clima','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('sanjiyo','lluvia','san-yí-yo','clima','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('foño','viento','fó-ño','clima','approximate',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kandi','calor / caliente','kán-di','clima','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('ninsi','vaca','nín-si','animales','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('baa','cabra','bá-a','animales','approximate',false,'Léxico común','materiales educativos',NULL,NULL),
 ('duwo','perro','dú-uo','animales','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('ñaŋkumoo','gato','ñang-ku-mó','animales','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('suwoo','caballo','su-uó','animales','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kono','pájaro','kó-no','animales','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('yiroo','árbol','yi-ró','naturaleza','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('bankoo','tierra / país','ban-kó','naturaleza','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('baa','río / mar','bá-a','naturaleza','approximate',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kodoo','dinero','ko-dó','dinero','verified',true,'Diccionario mandinka documentado','diccionario','Kodoo maŋ soto.','No hay dinero.'),
 ('daa','precio','dá-a','compras','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('marisewo','mercado','ma-ri-sé-uo','compras','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('saŋ','comprar','sáng','compras','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('waafi','vender','uáa-fi','compras','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('jaarabi','medicina','yaa-rá-bi','salud','approximate',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kuuraŋo','enfermedad','kuu-rán-go','salud','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('dokuwo','trabajo','do-kú-uo','trabajo','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('saatewo','pueblo / ciudad','saa-té-uo','lugares','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('siloo','camino','si-ló','transporte','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('mansakundaa','palacio / gobierno','man-sa-kun-dá','lugares','approximate',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kanoo','amor','ka-nó','amor','probable',false,'Léxico común','materiales educativos','N ye i kanu.','Te quiero.'),
 ('kanu','amar / querer','ká-nu','amor','verified',true,'Diccionario mandinka documentado','diccionario','N ye i kanu.','Te quiero.'),
 ('kontaani','contento / feliz','kon-táa-ni','sentimientos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kamfaa','enfadarse','kam-fá-a','sentimientos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('sila','miedo / temer','sí-la','sentimientos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('konko','hambre','kón-ko','sentimientos','verified',true,'Diccionario mandinka documentado','diccionario','Konko be n na.','Tengo hambre.'),
 ('mindoo','sed','min-dó','sentimientos','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('abaraka','gracias','a-ba-rá-ka','saludos','verified',true,'Uso corriente documentado','materiales educativos',NULL,NULL),
 ('salaamaalekum','saludo (paz contigo)','sa-laa-maa-lé-kum','saludos','verified',true,'Uso corriente documentado','materiales educativos',NULL,NULL),
 ('maalekumsalaam','respuesta al saludo','maa-le-kum-sa-láam','saludos','verified',true,'Uso corriente documentado','materiales educativos',NULL,NULL),
 ('haa','sí','há-a','conversacion','verified',true,'Uso corriente documentado','materiales educativos',NULL,NULL),
 ('hani','no','há-ni','conversacion','verified',true,'Uso corriente documentado','materiales educativos',NULL,NULL),
 ('dukare','por favor','du-ká-re','conversacion','probable',false,'Uso corriente documentado','materiales educativos',NULL,NULL),
 ('tooño','verdad','tó-o-ño','conversacion','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('alla','Dios','á-lla','cultura','verified',true,'Uso corriente documentado','materiales educativos',NULL,NULL),
 ('jumaa','viernes / mezquita (jumaa)','yu-má','cultura','approximate',false,'Léxico común','materiales educativos',NULL,NULL),
 ('duwaa','oración / rezar','du-uá','cultura','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('dendikoo','camisa / túnica','den-di-kó','ropa','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('kurutoo','pantalón','ku-ru-tó','ropa','probable',false,'Léxico común','materiales educativos',NULL,NULL),
 ('naafa','sombrero / gorro','ná-a-fa','ropa','approximate',false,'Léxico común','materiales educativos',NULL,NULL);

INSERT INTO public.phrases (spanish,mandinka,pronunciation,category_slug,confidence,sort_order,source_name) VALUES
 ('Hola (paz contigo)','Salaamaalekum','sa-laa-maa-lé-kum','saludos','verified',1,'Uso corriente documentado'),
 ('Respuesta al saludo','Maalekumsalaam','maa-le-kum-sa-láam','saludos','verified',2,'Uso corriente documentado'),
 ('¿Cómo estás?','I be ñaadi?','i be ñá-a-di','saludos','verified',3,'Uso corriente documentado'),
 ('Estoy bien','M be jee','m be yé','saludos','probable',4,'Uso corriente documentado'),
 ('¿Hay paz? (saludo)','Kori tanante?','kó-ri ta-nán-te','saludos','probable',5,'Uso corriente documentado'),
 ('Gracias','Abaraka','a-ba-rá-ka','saludos','verified',6,'Uso corriente documentado'),
 ('Muchas gracias','Abaraka baake','a-ba-rá-ka bá-a-que','saludos','probable',7,'Uso corriente documentado'),
 ('Por favor','Dukare','du-ká-re','conversacion','probable',8,'Uso corriente documentado'),
 ('Sí','Haa','há-a','conversacion','verified',9,'Uso corriente documentado'),
 ('No','Hani','há-ni','conversacion','verified',10,'Uso corriente documentado'),
 ('Ven aquí','Naa jaŋ','ná-a yáng','conversacion','probable',11,'Léxico común'),
 ('Espera','Batu','bá-tu','conversacion','probable',12,'Léxico común'),
 ('Date prisa','Tariyaa','ta-ri-yá','conversacion','approximate',13,'Léxico común'),
 ('¿Dónde estás?','I be miŋ?','i be míng','conversacion','probable',14,'Léxico común'),
 ('¿Dónde está el mercado?','Marisewo be miŋ?','ma-ri-sé-uo be míng','compras','probable',15,'Léxico común'),
 ('¿Cuánto cuesta?','A daa le mu jelu ti?','a dá-a le mu yé-lu ti','compras','probable',16,'Léxico común'),
 ('Tengo hambre','Konko be n na','kón-ko be n na','comida','probable',17,'Léxico común'),
 ('Tengo sed','Mindoo be n na','min-dó be n na','comida','probable',18,'Léxico común'),
 ('No entiendo','M maŋ a moyi','m mang a mó-yi','conversacion','probable',19,'Léxico común'),
 ('Habla más despacio','Diyaa domandiŋ','di-yá do-man-díng','conversacion','approximate',20,'Léxico común'),
 ('¿Qué significa esto?','Ñiŋ kotoo mu muŋ ti?','ñing ko-tó mu mung ti','conversacion','approximate',21,'Léxico común'),
 ('¿Cómo te llamas?','I too ndii?','i tó n-dí','saludos','probable',22,'Uso corriente documentado'),
 ('Me llamo...','N too mu ... le ti','n tó mu ... le ti','saludos','probable',23,'Uso corriente documentado'),
 ('Buenos días','I saama','i sá-a-ma','saludos','probable',24,'Uso corriente documentado'),
 ('Buenas tardes','I wulaara','i wu-lá-a-ra','saludos','probable',25,'Uso corriente documentado'),
 ('Buenas noches','I su','i sú','saludos','probable',26,'Uso corriente documentado'),
 ('Adiós / hasta luego','Fo waati koteŋ','fo uá-a-ti ko-téng','saludos','approximate',27,'Léxico común'),
 ('Te quiero','N ye i kanu','n ye i ká-nu','amor','verified',28,'Diccionario mandinka documentado'),
 ('Dame agua, por favor','Jiyo dii n na, dukare','yí-yo dí n na, du-ká-re','comida','probable',29,'Léxico común'),
 ('Estoy enfermo','N kuuranta','n kuu-rán-ta','salud','probable',30,'Léxico común'),
 ('Ayúdame','M maakoyi','m maa-kó-yi','salud','probable',31,'Léxico común'),
 ('No hay problema','Palasi te jee','pa-lá-si te yé','conversacion','approximate',32,'Léxico común'),
 ('¿Hablas español?','I ka espaañolkaŋo fo?','i ka es-pa-ñol-kán-go fo','conversacion','approximate',33,'Léxico común'),
 ('Un poco','Domandiŋ','do-man-díng','conversacion','probable',34,'Léxico común'),
 ('Vamos','Ŋà taa','nga tá-a','conversacion','probable',35,'Léxico común');
