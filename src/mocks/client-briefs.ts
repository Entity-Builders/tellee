/**
 * Mock client briefs for development and testing.
 *
 * Each mock includes:
 * - id: unique identifier
 * - label: short descriptive name
 * - domain: inferred profession/industry
 * - locale: language / region
 * - input: the raw client free-text
 */

export interface MockClientBrief {
  id: string;
  label: string;
  domain: string;
  locale: string;
  input: string;
}

export const MOCK_CLIENT_BRIEFS: MockClientBrief[] = [
  {
    id: 'journalism-blog-ar',
    label: 'Sitio de notas periodísticas (AR)',
    domain: 'web-development',
    locale: 'es-AR',
    input: `Che, mirá, estuve dando vueltas y necesito armarme mi propio sitio para las notas de investigación porque en el diario me recortan todo, pero la verdad que de sistemas no cazo una, soy de madera. Le pondría de nombre algo como Pasaporte al Día o capaz Crónicas de Juan, no sé cuál suena menos aburrido, ¿vos qué decís? Estuve viendo este diseño en una página que se llama ThemeForest, el link es este https://themeforest.net/item/newspaper-news-magazine-wordpress-theme/5489601 o uno parecido que sea así limpito, con mucho blanco y que la letra se vea grande porque si no la gente en el bus no lee nada. La idea es que cuando entres se vea una foto gigante de la última nota con el título bien fuerte, y después abajo las otras por categorías, ponele Política, Judiciales y algo de Opinión, pero que yo pueda cambiar los nombres si me pinta. Otra cosa, no sé si comprar un dominio .com o un .com.ar, ¿cuál me conviene para que me encuentren más fácil en Google? ¿Es muy caro eso? Y otra duda, ¿los videos de YouTube se pueden pegar directo o se me va a trabar toda la página? Porque a veces grabo entrevistas con el celu y las quiero meter ahí en el medio del texto sin que sea un quilombo. ¿Se podrá hacer que cuando la gente termine de leer les aparezca un cartelito para que dejen el mail? No sé si eso se hace con un programa aparte o si WordPress ya lo trae. Lo más importante es que yo pueda escribir tipo en un Word, pegar una foto y que quede lindo solo, porque no quiero andar tocando códigos ni nada raro, quiero apretar publicar y que parezca el New York Times pero manejado por mí solo desde la cocina de casa. ¿Es mucha ciencia o me estoy mandando en un lío bárbaro?`,
  },
];
