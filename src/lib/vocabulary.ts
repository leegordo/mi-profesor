// Bilingual vocabulary for a simple English ⇄ Spanish translator.
// Spanish here is *Latin American* Spanish (e.g. "computadora", "carro",
// "celular", "jugo", "ustedes") rather than Peninsular / Spain Spanish.
//
// Each entry is a [english, spanish] pair. Lookup is bidirectional and
// accent-insensitive. Multi-word phrases are matched whole before the
// translator falls back to word-by-word translation.

export type Pair = [en: string, es: string]

export const VOCABULARY: Pair[] = [
  // ── Greetings & courtesy ──────────────────────────────────────────
  ['hello', 'hola'],
  ['hi', 'hola'],
  ['goodbye', 'adiós'],
  ['bye', 'chau'],
  ['good morning', 'buenos días'],
  ['good afternoon', 'buenas tardes'],
  ['good evening', 'buenas noches'],
  ['good night', 'buenas noches'],
  ['please', 'por favor'],
  ['thank you', 'gracias'],
  ['thanks', 'gracias'],
  ['thank you very much', 'muchas gracias'],
  ["you're welcome", 'de nada'],
  ['excuse me', 'disculpe'],
  ['sorry', 'perdón'],
  ['welcome', 'bienvenido'],
  ['cheers', 'salud'],
  ['congratulations', 'felicidades'],
  ['how are you', 'cómo estás'],
  ['what is your name', 'cómo te llamas'],
  ['my name is', 'me llamo'],
  ['nice to meet you', 'mucho gusto'],
  ['see you later', 'hasta luego'],
  ['see you tomorrow', 'hasta mañana'],
  ['of course', 'por supuesto'],

  // ── Common answers / question words ───────────────────────────────
  ['yes', 'sí'],
  ['no', 'no'],
  ['maybe', 'quizás'],
  ['ok', 'bueno'],
  ['who', 'quién'],
  ['what', 'qué'],
  ['where', 'dónde'],
  ['when', 'cuándo'],
  ['why', 'por qué'],
  ['how', 'cómo'],
  ['how much', 'cuánto'],
  ['how many', 'cuántos'],
  ['which', 'cuál'],

  // ── Pronouns ──────────────────────────────────────────────────────
  ['i', 'yo'],
  ['you', 'tú'],
  ['he', 'él'],
  ['she', 'ella'],
  ['we', 'nosotros'],
  ['they', 'ellos'],
  ['you all', 'ustedes'], // LatAm: ustedes, not vosotros
  ['me', 'mí'],
  ['my', 'mi'],
  ['your', 'tu'],
  ['his', 'su'],
  ['her', 'su'],
  ['our', 'nuestro'],
  ['this', 'esto'],
  ['that', 'eso'],
  ['these', 'estos'],
  ['those', 'esos'],

  // ── People & family ───────────────────────────────────────────────
  ['man', 'hombre'],
  ['woman', 'mujer'],
  ['boy', 'niño'],
  ['girl', 'niña'],
  ['child', 'niño'],
  ['baby', 'bebé'],
  ['person', 'persona'],
  ['people', 'gente'],
  ['friend', 'amigo'],
  ['family', 'familia'],
  ['mother', 'mamá'],
  ['father', 'papá'],
  ['mom', 'mamá'],
  ['dad', 'papá'],
  ['son', 'hijo'],
  ['daughter', 'hija'],
  ['brother', 'hermano'],
  ['sister', 'hermana'],
  ['grandmother', 'abuela'],
  ['grandfather', 'abuelo'],
  ['husband', 'esposo'],
  ['wife', 'esposa'],
  ['boyfriend', 'novio'],
  ['girlfriend', 'novia'],
  ['neighbor', 'vecino'],
  ['teacher', 'maestro'],
  ['student', 'estudiante'],
  ['doctor', 'doctor'],

  // ── Numbers ───────────────────────────────────────────────────────
  ['zero', 'cero'],
  ['one', 'uno'],
  ['two', 'dos'],
  ['three', 'tres'],
  ['four', 'cuatro'],
  ['five', 'cinco'],
  ['six', 'seis'],
  ['seven', 'siete'],
  ['eight', 'ocho'],
  ['nine', 'nueve'],
  ['ten', 'diez'],
  ['eleven', 'once'],
  ['twelve', 'doce'],
  ['twenty', 'veinte'],
  ['thirty', 'treinta'],
  ['fifty', 'cincuenta'],
  ['hundred', 'cien'],
  ['thousand', 'mil'],
  ['first', 'primero'],
  ['second', 'segundo'],
  ['last', 'último'],

  // ── Time, days, months ────────────────────────────────────────────
  ['day', 'día'],
  ['week', 'semana'],
  ['month', 'mes'],
  ['year', 'año'],
  ['today', 'hoy'],
  ['tomorrow', 'mañana'],
  ['yesterday', 'ayer'],
  ['now', 'ahora'],
  ['later', 'después'],
  ['hour', 'hora'],
  ['minute', 'minuto'],
  ['morning', 'mañana'],
  ['afternoon', 'tarde'],
  ['night', 'noche'],
  ['time', 'tiempo'],
  ['monday', 'lunes'],
  ['tuesday', 'martes'],
  ['wednesday', 'miércoles'],
  ['thursday', 'jueves'],
  ['friday', 'viernes'],
  ['saturday', 'sábado'],
  ['sunday', 'domingo'],
  ['january', 'enero'],
  ['february', 'febrero'],
  ['march', 'marzo'],
  ['april', 'abril'],
  ['may', 'mayo'],
  ['june', 'junio'],
  ['july', 'julio'],
  ['august', 'agosto'],
  ['september', 'septiembre'],
  ['october', 'octubre'],
  ['november', 'noviembre'],
  ['december', 'diciembre'],

  // ── Colors ────────────────────────────────────────────────────────
  ['color', 'color'],
  ['red', 'rojo'],
  ['orange', 'anaranjado'],
  ['yellow', 'amarillo'],
  ['green', 'verde'],
  ['blue', 'azul'],
  ['purple', 'morado'],
  ['pink', 'rosado'],
  ['brown', 'café'],
  ['black', 'negro'],
  ['white', 'blanco'],
  ['gray', 'gris'],

  // ── Food & drink (LatAm choices) ──────────────────────────────────
  ['food', 'comida'],
  ['water', 'agua'],
  ['coffee', 'café'],
  ['tea', 'té'],
  ['juice', 'jugo'], // LatAm: jugo, not zumo
  ['milk', 'leche'],
  ['beer', 'cerveza'],
  ['wine', 'vino'],
  ['bread', 'pan'],
  ['cheese', 'queso'],
  ['egg', 'huevo'],
  ['meat', 'carne'],
  ['chicken', 'pollo'],
  ['fish', 'pescado'],
  ['rice', 'arroz'],
  ['bean', 'frijol'], // LatAm: frijol, not judía/alubia
  ['potato', 'papa'], // LatAm: papa, not patata
  ['fruit', 'fruta'],
  ['apple', 'manzana'],
  ['banana', 'banana'],
  ['orange fruit', 'naranja'],
  ['strawberry', 'fresa'],
  ['avocado', 'aguacate'],
  ['tomato', 'tomate'],
  ['sugar', 'azúcar'],
  ['salt', 'sal'],
  ['breakfast', 'desayuno'],
  ['lunch', 'almuerzo'],
  ['dinner', 'cena'],
  ['cake', 'pastel'], // LatAm: pastel/torta
  ['ice cream', 'helado'],
  ['sandwich', 'sándwich'],

  // ── Places ────────────────────────────────────────────────────────
  ['house', 'casa'],
  ['home', 'casa'],
  ['apartment', 'apartamento'],
  ['room', 'cuarto'],
  ['kitchen', 'cocina'],
  ['bathroom', 'baño'],
  ['street', 'calle'],
  ['city', 'ciudad'],
  ['town', 'pueblo'],
  ['country', 'país'],
  ['world', 'mundo'],
  ['school', 'escuela'],
  ['work', 'trabajo'],
  ['office', 'oficina'],
  ['store', 'tienda'],
  ['market', 'mercado'],
  ['restaurant', 'restaurante'],
  ['hotel', 'hotel'],
  ['hospital', 'hospital'],
  ['airport', 'aeropuerto'],
  ['beach', 'playa'],
  ['park', 'parque'],
  ['bank', 'banco'],
  ['church', 'iglesia'],
  ['library', 'biblioteca'],

  // ── Travel & transport (LatAm choices) ────────────────────────────
  ['car', 'carro'], // LatAm: carro/auto, not coche
  ['bus', 'autobús'],
  ['train', 'tren'],
  ['plane', 'avión'],
  ['airplane', 'avión'],
  ['bicycle', 'bicicleta'],
  ['ticket', 'boleto'], // LatAm: boleto, not billete
  ['road', 'camino'],
  ['map', 'mapa'],
  ['suitcase', 'maleta'],
  ['passport', 'pasaporte'],

  // ── Everyday objects & tech (LatAm choices) ───────────────────────
  ['phone', 'teléfono'],
  ['cellphone', 'celular'], // LatAm: celular, not móvil
  ['computer', 'computadora'], // LatAm: computadora, not ordenador
  ['book', 'libro'],
  ['pen', 'bolígrafo'],
  ['pencil', 'lápiz'],
  ['paper', 'papel'],
  ['table', 'mesa'],
  ['chair', 'silla'],
  ['bed', 'cama'],
  ['door', 'puerta'],
  ['window', 'ventana'],
  ['key', 'llave'],
  ['bag', 'bolsa'],
  ['clothes', 'ropa'],
  ['shirt', 'camisa'],
  ['shoe', 'zapato'],
  ['hat', 'sombrero'],
  ['watch', 'reloj'],
  ['glasses', 'lentes'], // LatAm: lentes, not gafas
  ['money', 'dinero'],
  ['card', 'tarjeta'],
  ['camera', 'cámara'],
  ['music', 'música'],
  ['light', 'luz'],

  // ── Nature & animals ──────────────────────────────────────────────
  ['sun', 'sol'],
  ['moon', 'luna'],
  ['star', 'estrella'],
  ['sky', 'cielo'],
  ['rain', 'lluvia'],
  ['snow', 'nieve'],
  ['wind', 'viento'],
  ['fire', 'fuego'],
  ['tree', 'árbol'],
  ['flower', 'flor'],
  ['mountain', 'montaña'],
  ['river', 'río'],
  ['sea', 'mar'],
  ['dog', 'perro'],
  ['cat', 'gato'],
  ['bird', 'pájaro'],
  ['horse', 'caballo'],
  ['cow', 'vaca'],

  // ── Body & health ─────────────────────────────────────────────────
  ['head', 'cabeza'],
  ['hand', 'mano'],
  ['arm', 'brazo'],
  ['leg', 'pierna'],
  ['foot', 'pie'],
  ['eye', 'ojo'],
  ['ear', 'oreja'],
  ['nose', 'nariz'],
  ['mouth', 'boca'],
  ['hair', 'pelo'],
  ['heart', 'corazón'],
  ['medicine', 'medicina'],

  // ── Common adjectives ─────────────────────────────────────────────
  ['good', 'bueno'],
  ['bad', 'malo'],
  ['big', 'grande'],
  ['small', 'pequeño'],
  ['hot', 'caliente'],
  ['cold', 'frío'],
  ['new', 'nuevo'],
  ['old', 'viejo'],
  ['young', 'joven'],
  ['happy', 'feliz'],
  ['sad', 'triste'],
  ['beautiful', 'hermoso'],
  ['ugly', 'feo'],
  ['easy', 'fácil'],
  ['hard', 'difícil'],
  ['fast', 'rápido'],
  ['slow', 'lento'],
  ['expensive', 'caro'],
  ['cheap', 'barato'],
  ['open', 'abierto'],
  ['closed', 'cerrado'],
  ['near', 'cerca'],
  ['far', 'lejos'],
  ['right', 'correcto'],
  ['wrong', 'equivocado'],
  ['clean', 'limpio'],
  ['dirty', 'sucio'],
  ['strong', 'fuerte'],
  ['tired', 'cansado'],
  ['hungry', 'hambriento'],
  ['delicious', 'delicioso'],

  // ── Common verbs (infinitive) ─────────────────────────────────────
  ['to be', 'ser'],
  ['to have', 'tener'],
  ['to do', 'hacer'],
  ['to go', 'ir'],
  ['to come', 'venir'],
  ['to want', 'querer'],
  ['to need', 'necesitar'],
  ['to eat', 'comer'],
  ['to drink', 'beber'],
  ['to speak', 'hablar'],
  ['to say', 'decir'],
  ['to see', 'ver'],
  ['to know', 'saber'],
  ['to think', 'pensar'],
  ['to give', 'dar'],
  ['to take', 'tomar'],
  ['to live', 'vivir'],
  ['to work', 'trabajar'],
  ['to buy', 'comprar'],
  ['to read', 'leer'],
  ['to write', 'escribir'],
  ['to sleep', 'dormir'],
  ['to walk', 'caminar'],
  ['to run', 'correr'],
  ['to drive', 'manejar'], // LatAm: manejar, not conducir
  ['to learn', 'aprender'],
  ['to understand', 'entender'],
  ['to love', 'amar'],
  ['to like', 'gustar'],
  ['to help', 'ayudar'],
  ['to open', 'abrir'],
  ['to close', 'cerrar'],
  ['to find', 'encontrar'],
  ['to use', 'usar'],
  ['to pay', 'pagar'],
  ['to wait', 'esperar'],

  // ── Useful little words & phrases ─────────────────────────────────
  ['and', 'y'],
  ['or', 'o'],
  ['but', 'pero'],
  ['because', 'porque'],
  ['with', 'con'],
  ['without', 'sin'],
  ['for', 'para'],
  ['from', 'de'],
  ['to', 'a'],
  ['in', 'en'],
  ['on', 'sobre'],
  ['under', 'debajo'],
  ['here', 'aquí'],
  ['there', 'allí'],
  ['very', 'muy'],
  ['more', 'más'],
  ['less', 'menos'],
  ['a little', 'un poco'],
  ['a lot', 'mucho'],
  ['all', 'todo'],
  ['nothing', 'nada'],
  ['something', 'algo'],
  ['everything', 'todo'],
  ['always', 'siempre'],
  ['never', 'nunca'],
  ['i love you', 'te amo'],
  ['i like it', 'me gusta'],
  ["i don't know", 'no sé'],
  ['i understand', 'entiendo'],
  ["i don't understand", 'no entiendo'],
  ['help me', 'ayúdame'],
  ['how much is it', 'cuánto cuesta'],
  ['where is the bathroom', 'dónde está el baño'],
  ['what time is it', 'qué hora es'],
]

// ── Lookup machinery ────────────────────────────────────────────────

/** Lowercase, trim, collapse internal whitespace, strip diacritics and
 *  surrounding punctuation so "¿Cómo?" and "como" match the same key. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop accent marks
    .replace(/[¿?¡!.,;:"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const enToEs = new Map<string, string>()
const esToEn = new Map<string, string>()

for (const [en, es] of VOCABULARY) {
  // First definition wins, so earlier (more common) entries take priority.
  const enKey = normalize(en)
  const esKey = normalize(es)
  if (!enToEs.has(enKey)) enToEs.set(enKey, es)
  if (!esToEn.has(esKey)) esToEn.set(esKey, en)
}

export type Direction = 'en-es' | 'es-en'

function matchCase(sample: string, target: string): string {
  if (!sample || !target) return target
  // If the source word started uppercase, capitalize the translation too.
  if (sample[0] === sample[0].toUpperCase() && sample[0] !== sample[0].toLowerCase()) {
    return target[0].toUpperCase() + target.slice(1)
  }
  return target
}

/**
 * Translate vocabulary in the given direction. Tries a whole-phrase match
 * first, then falls back to translating word by word. Unknown words pass
 * through unchanged so partial input still reads sensibly.
 */
export function translate(input: string, direction: Direction): string {
  const map = direction === 'en-es' ? enToEs : esToEn
  const trimmed = input.trim()
  if (!trimmed) return ''

  // Whole-phrase match (handles "good morning" → "buenos días").
  const wholeKey = normalize(trimmed)
  const whole = map.get(wholeKey)
  if (whole) return matchCase(trimmed, whole)

  // Word-by-word fallback.
  const words = trimmed.split(/\s+/)
  const out = words.map((word) => {
    const key = normalize(word)
    if (!key) return word
    const hit = map.get(key)
    return hit ? matchCase(word, hit) : word
  })
  return out.join(' ')
}

export const VOCABULARY_SIZE = VOCABULARY.length
