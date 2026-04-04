export type ZoneLevel = "excelente" | "muy buena" | "buena" | "media" | "variable";
export type PlusvaliaPerspectiva = "alta" | "media-alta" | "media" | "orientada al retorno";

export interface ZoneIndicator {
  level: ZoneLevel;
  text: string;
}

export interface ZoneData {
  seguridad: ZoneIndicator;
  transporte: ZoneIndicator;
  areas_verdes: ZoneIndicator;
  salud: ZoneIndicator;
  densidad: ZoneIndicator;
  plusvalia: {
    perspectiva: PlusvaliaPerspectiva;
    text: string;
  };
}

const ZONES: Record<string, ZoneData> = {
  Providencia: {
    seguridad: {
      level: "muy buena",
      text: "Una de las comunas con menor índice delictual de Santiago. Alta densidad residencial y fuerte presencia de comercio activo generan control social natural.",
    },
    transporte: {
      level: "excelente",
      text: "Tres líneas de metro (1, 4 y 5), amplia red de microbuses, ciclovías y bicicletas públicas. Acceso peatonal a cualquier punto de la comuna sin necesidad de auto.",
    },
    areas_verdes: {
      level: "buena",
      text: "Parque Balmaceda, Parque de Las Esculturas y riberas del Mapocho. Múltiples plazas de barrio bien mantenidas con alta actividad durante todo el año.",
    },
    salud: {
      level: "excelente",
      text: "Clínica Indisa, Clínica Santa María y Clínica Vespucio a pocos minutos. Alta densidad de consultas médicas, clínicas dentales y centros de especialidades.",
    },
    densidad: {
      level: "muy buena",
      text: "Comuna consolidada de alta densidad con excelente mezcla de usos: residencial, comercial y gastronómico. Vida urbana activa que sostiene alta demanda de arriendos.",
    },
    plusvalia: {
      perspectiva: "alta",
      text: "Zona madura con demanda estructuralmente alta y baja vacancia histórica. El precio/m² se ha apreciado consistentemente por sobre la inflación en la última década. Alta liquidez: propiedades bien ubicadas en Providencia se venden y arriendan rápido. Para un inversionista, combina retorno de arriendo estable con protección del capital en el largo plazo.",
    },
  },

  "Las Condes": {
    seguridad: {
      level: "muy buena",
      text: "Fuerte inversión municipal en vigilancia y espacio público. Alta percepción de seguridad tanto residencial como comercial. Una de las referencias de calidad de vida del Gran Santiago.",
    },
    transporte: {
      level: "buena",
      text: "Metro línea 1 cubre el corredor Apoquindo-El Golf. Sectores más altos (Chicureo, Lo Barnechea limítrofe) tienen menor cobertura y mayor dependencia del auto. Corredor Apoquindo con buena frecuencia de micros.",
    },
    areas_verdes: {
      level: "buena",
      text: "Parque Araucano y Parque Juan XXIII son los referentes. Sectores altos tienen quebradas y áreas naturales. Mantención municipal de alto estándar.",
    },
    salud: {
      level: "excelente",
      text: "Clínica Las Condes (referente regional), múltiples centros médicos privados de primer nivel en corredor Apoquindo y Manquehue. La mejor cobertura médica privada de Santiago.",
    },
    densidad: {
      level: "buena",
      text: "Mezcla de zonas residenciales de baja densidad con corredores de alta densidad comercial y residencial. Perfil mixto: ejecutivos, familias y profesionales con capacidad de pago.",
    },
    plusvalia: {
      perspectiva: "alta",
      text: "Mercado de referencia en Santiago con alta resiliencia en ciclos bajos. Fuerte demanda de arriendo corporativo y ejecutivo sostiene yields en el sector El Golf y Apoquindo. Aunque el retorno de arriendo es más moderado que en comunas populares, la protección patrimonial y la liquidez del mercado son superiores. Ideal para perfil conservador que prioriza seguridad del capital.",
    },
  },

  "Ñuñoa": {
    seguridad: {
      level: "buena",
      text: "Percepción de seguridad favorable y en mejora. La mayor densidad urbana producida por el boom inmobiliario y la extensión del metro ha incrementado la actividad en el espacio público, lo que actúa como factor disuasivo.",
    },
    transporte: {
      level: "muy buena",
      text: "Líneas 3 y 4 del metro cubren la mayor parte de la comuna. Ejes Irarrázaval y Grecia con alta frecuencia de microbuses. Buena conectividad peatonal y ciclista.",
    },
    areas_verdes: {
      level: "buena",
      text: "Parque Bustamante, Estadio Nacional sector y Plaza Ñuñoa son referentes. Varias plazas de barrio activas. Buena calidad de espacio público para una comuna de alta densidad.",
    },
    salud: {
      level: "buena",
      text: "Hospital del Salvador, Clínica Avansalud y múltiples centros privados. Cobertura adecuada para la escala de la comuna, con opciones tanto públicas como privadas.",
    },
    densidad: {
      level: "muy buena",
      text: "Alto dinamismo residencial impulsado por profesionales jóvenes. Excelente mezcla de vida de barrio, gastronomía y comercio. La renovación urbana continúa atrayendo nueva demanda.",
    },
    plusvalia: {
      perspectiva: "media-alta",
      text: "La extensión de la línea 3 del metro revalorizó varios sectores de Ñuñoa de forma significativa en los últimos años. Alta demanda de arriendo del segmento profesional joven con capacidad de pago creciente. Yields consistentemente atractivos para el precio de entrada. El proceso de densificación sigue activo, lo que sugiere que la demanda y los precios se mantendrán firmes en el mediano plazo.",
    },
  },

  Santiago: {
    seguridad: {
      level: "variable",
      text: "Varía significativamente por sector. Barrio Italia, Lastarria y Brasil tienen buena percepción. El centro histórico y entorno Plaza de Armas presentan mayores índices. La ubicación específica dentro de la comuna importa más que el promedio comunal.",
    },
    transporte: {
      level: "excelente",
      text: "El hub de transporte más completo de Chile: hub de líneas 1, 2, 3, 4 y 5 del metro. Máxima densidad de microbuses, Transantiago y transporte privado. Sin auto, se accede a cualquier punto del Gran Santiago.",
    },
    areas_verdes: {
      level: "media",
      text: "Parque O'Higgins y Cerro Santa Lucía son los principales. Barrio Italia y Lastarria tienen plazas bien cuidadas. El centro histórico tiene menor ratio de m² verdes por habitante respecto a otras comunas.",
    },
    salud: {
      level: "buena",
      text: "Hospital San Borja-Arriarán, Hospital San José, Clínica Santa María y múltiples centros privados. Alta densidad de farmacias y consultas. Buena cobertura a todos los niveles socioeconómicos.",
    },
    densidad: {
      level: "excelente",
      text: "La comuna más densa de Chile. Alto flujo de actividad las 24 horas, fuerte demanda de arriendos de corto y largo plazo por estudiantes, trabajadores y extranjeros.",
    },
    plusvalia: {
      perspectiva: "orientada al retorno",
      text: "La apuesta en Santiago Centro es principalmente por retorno de arriendo, no por apreciación del capital. Los precios de entrada más bajos combinados con alta demanda de arriendo generan los yields más altos del Gran Santiago. La revalorización del capital es más volátil y depende fuertemente de la ubicación dentro de la comuna. Ideal para inversionistas que priorizan el flujo de caja sobre la plusvalía.",
    },
  },

  Vitacura: {
    seguridad: {
      level: "excelente",
      text: "La comuna con mejores índices de seguridad de Chile de forma consistente. Muy baja densidad de incidentes, alto control municipal y alta cohesión social del barrio.",
    },
    transporte: {
      level: "media",
      text: "Menor cobertura de metro: la línea 1 llega al límite con Las Condes. La mayor parte de la comuna requiere movilización en automóvil o servicios de transporte privado. Ciclovías en sectores específicos.",
    },
    areas_verdes: {
      level: "excelente",
      text: "Parque Bicentenario (referente de calidad urbana en Chile), Parque Vitacura y múltiples áreas verdes de mantención premium. El mayor ratio de m² de áreas verdes por habitante de Santiago.",
    },
    salud: {
      level: "excelente",
      text: "Clínica Las Condes a minutos, múltiples centros médicos privados de alto nivel. La mejor concentración de medicina privada de alta complejidad de la Región Metropolitana.",
    },
    densidad: {
      level: "buena",
      text: "Baja densidad con predominio de casas, edificios de baja altura y condominios. Perfil residencial tranquilo y familiar. El ambiente de barrio es uno de sus principales atributos.",
    },
    plusvalia: {
      perspectiva: "alta",
      text: "El activo inmobiliario más defensivo de Santiago: el valor del suelo en Vitacura ha crecido consistentemente incluso en ciclos bajos del mercado. Menor yield de arriendo en términos porcentuales, pero con la mayor protección patrimonial disponible en Chile. Ideal para quien prioriza preservar capital en el largo plazo sobre maximizar flujo de caja.",
    },
  },

  "San Miguel": {
    seguridad: {
      level: "media",
      text: "Percepción mixta según el sector. Gran Avenida tiene mayor actividad comercial con mayor variabilidad. Los barrios interiores son más tranquilos. La renovación urbana en curso está mejorando el entorno de forma paulatina.",
    },
    transporte: {
      level: "muy buena",
      text: "Metro línea 2 con varias estaciones en la comuna y la línea 4 en el límite oriente. Excelente frecuencia de microbuses en Gran Avenida. Buena conectividad con el centro y comunas vecinas.",
    },
    areas_verdes: {
      level: "media",
      text: "Parque Isabel Riquelme y Plaza de Armas San Miguel son los principales. La municipalidad ha invertido en mejoras del espacio público, aunque la cobertura total es menor que en comunas del sector oriente.",
    },
    salud: {
      level: "buena",
      text: "Hospital Barros Luco-Trudeau (hospital público de referencia), centros de salud municipal y clínicas privadas en crecimiento. Buena cobertura para la escala y densidad de la comuna.",
    },
    densidad: {
      level: "muy buena",
      text: "Alta densidad en crecimiento sostenido. Fuerte desarrollo inmobiliario de departamentos que está transformando la imagen de la comuna. Perfil de residentes en proceso de mejora socioeconómica.",
    },
    plusvalia: {
      perspectiva: "media-alta",
      text: "Una de las mejores relaciones precio de entrada / yield de arriendo del Gran Santiago. Alta demanda de arriendo de perfil trabajador y familiar. El ciclo de renovación urbana activo sugiere upside de plusvalía relevante en el mediano plazo: a medida que los nuevos proyectos se consolidan, el perfil del barrio mejora y los precios tienden a seguir. Oportunidad para inversionistas con visión de largo plazo.",
    },
  },

  "Maipú": {
    seguridad: {
      level: "media",
      text: "Varía por sector. La periferia de la comuna tiene mayores índices que el casco central. La alta densidad poblacional implica mayor actividad de todo tipo. Sectores cercanos al metro tienen mejor percepción.",
    },
    transporte: {
      level: "buena",
      text: "Metro línea 5 conecta con el centro en menos de 30 minutos. Buena red de microbuses en los principales ejes. Congestión vehicular importante en horas punta en Américo Vespucio y Pajaritos.",
    },
    areas_verdes: {
      level: "buena",
      text: "Parque de Maipú, Estadio Municipal y varias plazas de barrio distribuidas en la comuna. La escala de la comuna permite espacios verdes accesibles para la mayoría de sus residentes.",
    },
    salud: {
      level: "buena",
      text: "Hospital de Maipú, centros de salud municipal distribuidos y múltiples clínicas y consultas privadas. Servicio razonablemente adecuado para la alta densidad, aunque con demanda alta en sector público.",
    },
    densidad: {
      level: "excelente",
      text: "Una de las comunas más pobladas de Chile (~600.000 habitantes). Altísima demanda de bienes y servicios de todo tipo, lo que sostiene una demanda de arriendo estructuralmente alta.",
    },
    plusvalia: {
      perspectiva: "media",
      text: "Mercado de alto volumen con precios accesibles y alta liquidez. Los yields son elevados gracias a la fuerte demanda de arriendo del sector de trabajadores y familias. La apreciación del capital es más moderada que en comunas del sector oriente, pero la estrategia de retorno por flujo de caja funciona bien. El aumento de la conectividad de metro y los proyectos de renovación comunal podrían mejorar las perspectivas en el mediano plazo.",
    },
  },

  "Lo Barnechea": {
    seguridad: {
      level: "buena",
      text: "Percepción de seguridad favorable, especialmente en los sectores consolidados de La Dehesa y El Arrayán. Los condominios cerrados con vigilancia 24/7 son el formato dominante. Los sectores más periféricos hacia la precordillera tienen menor densidad y requieren más desplazamiento en auto.",
    },
    transporte: {
      level: "media",
      text: "Alta dependencia del automóvil. No cuenta con metro y la red de microbuses cubre principalmente el eje Av. La Dehesa y Camino El Alba. Los tiempos de viaje al centro pueden superar los 45 minutos en hora punta. Taxis y servicios de transporte privado son la alternativa habitual para residentes.",
    },
    areas_verdes: {
      level: "excelente",
      text: "La mayor ventaja natural de la comuna: acceso directo a la precordillera, quebradas, cerros y áreas de esparcimiento al aire libre. Parque La Dehesa y múltiples canchas deportivas en condominios. El contacto con la naturaleza es el principal atributo diferenciador respecto a otras comunas.",
    },
    salud: {
      level: "buena",
      text: "Clínica Las Condes a menos de 15 minutos. Centros médicos privados y consultas en el sector La Dehesa. Cobertura adecuada para el perfil socioeconómico de la comuna, aunque con menor densidad de centros que comunas más urbanas.",
    },
    densidad: {
      level: "buena",
      text: "Baja densidad con predominio de casas en condominio y departamentos de mayor tamaño. Perfil residencial familiar de segmento ABC1 y C2. La baja densidad es un atributo valorado por sus residentes y sostiene una demanda de arriendo estable en el segmento ejecutivo.",
    },
    plusvalia: {
      perspectiva: "media-alta",
      text: "Mercado con alta demanda del segmento ejecutivo y familiar de ingresos altos. Los precios en La Dehesa y El Arrayán han mostrado resiliencia en ciclos bajos por el escaso suelo disponible y la preferencia de familias por el entorno natural. El yield de arriendo es moderado dado el alto precio de entrada, pero la apreciación del capital en el largo plazo ha sido consistente. Mercado relativamente ilíquido comparado con comunas céntricas: los plazos de venta son más largos.",
    },
  },

  "La Florida": {
    seguridad: {
      level: "media",
      text: "Percepción variable según el sector. Los barrios cercanos al metro y las zonas más consolidadas del sector oriente tienen mejor perfil. La alta densidad poblacional implica mayor actividad en el espacio público, con diferencias importantes entre sectores. La conectividad del metro ha contribuido a mejorar la percepción en los últimos años.",
    },
    transporte: {
      level: "muy buena",
      text: "Metro línea 5 atraviesa la comuna con múltiples estaciones (Vicente Valdés, Rojas Magallanes, Plaza de Puente Alto) y la línea 4 en el límite sur. Excelente conectividad con el centro en 30–40 minutos. Gran Avenida y Vicuña Mackenna son ejes con alta frecuencia de microbuses. Una de las mejores coberturas de transporte público de las comunas periféricas de Santiago.",
    },
    areas_verdes: {
      level: "buena",
      text: "Parque La Florida y varios parques urbanos bien distribuidos en la comuna. Acceso relativamente cercano a la precordillera en sectores del oriente. La municipalidad ha invertido en mejoras del espacio público en torno a las estaciones de metro.",
    },
    salud: {
      level: "buena",
      text: "Hospital Padre Hurtado en comunas vecinas, CESFAM distribuidos en la comuna y creciente oferta de clínicas privadas. Cobertura adecuada para una comuna de alta densidad, con buena accesibilidad a centros de mayor complejidad en Las Condes y Providencia vía metro.",
    },
    densidad: {
      level: "muy buena",
      text: "Una de las comunas más pobladas de la RM (~400.000 habitantes) con alta densidad residencial. Fuerte demanda de arriendo de trabajadores, familias y estudiantes. La extensión del metro generó un ciclo de desarrollo inmobiliario que sigue activo, transformando sectores en torno a las estaciones.",
    },
    plusvalia: {
      perspectiva: "media-alta",
      text: "Mercado de alto volumen con precios accesibles y buena liquidez. La cobertura de metro es el principal driver de demanda y de apreciación del capital: las propiedades más cercanas a estaciones han mostrado revalorización consistente. Los yields de arriendo son atractivos para el precio de entrada. El ciclo de renovación urbana en torno a los ejes de metro tiene recorrido adicional, especialmente en los sectores aún no consolidados.",
    },
  },

  Quilicura: {
    seguridad: {
      level: "media",
      text: "Zona en proceso de consolidación con niveles de seguridad variables por sector. Los barrios más consolidados alrededor del metro presentan mejor percepción que la periferia en expansión.",
    },
    transporte: {
      level: "buena",
      text: "Metro línea 2 en extensión norte con estaciones en la comuna. Buena conectividad en microbuses hacia el centro aunque con frecuencias irregulares. La cobertura sigue mejorando con el crecimiento urbano.",
    },
    areas_verdes: {
      level: "media",
      text: "En desarrollo. La expansión urbana está generando nuevas plazas y parques, aunque la cobertura aún es menor que en comunas más consolidadas. Tendencia positiva en los últimos años.",
    },
    salud: {
      level: "media",
      text: "Centros de salud municipal y consultas privadas en crecimiento. La infraestructura de salud está aumentando en paralelo al crecimiento de la población, aunque aún con déficit respecto a comunas maduras.",
    },
    densidad: {
      level: "muy buena",
      text: "Alta y en rápido crecimiento. Fuerte expansión inmobiliaria residencial orientada a clase media. La demanda de arriendo es alta y sostenida por el crecimiento de la población.",
    },
    plusvalia: {
      perspectiva: "media-alta",
      text: "Mercado emergente con precios accesibles y potencial de revalorización. El crecimiento de la infraestructura de transporte —especialmente el avance del metro— es el principal driver de plusvalía esperada. Mayor riesgo que comunas consolidadas, pero también mayor potencial de apreciación porcentual. Recomendable para inversionistas con tolerancia a esperar 5–10 años para capturar el upside.",
    },
  },
};

/** Returns zone data for the given commune, or null if not found. */
export function getZoneData(commune: string | null | undefined): ZoneData | null {
  if (!commune) return null;
  return ZONES[commune] ?? null;
}

export const LEVEL_COLORS: Record<ZoneLevel, { bg: string; text: string; dot: string }> = {
  excelente:   { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  "muy buena": { bg: "bg-teal-50",   text: "text-teal-700",   dot: "bg-teal-500" },
  buena:       { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400" },
  media:       { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  variable:    { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
};

export const PLUSVALIA_COLORS: Record<PlusvaliaPerspectiva, { bg: string; text: string }> = {
  "alta":                { bg: "bg-green-50",  text: "text-green-700" },
  "media-alta":          { bg: "bg-teal-50",   text: "text-teal-700" },
  "media":               { bg: "bg-blue-50",   text: "text-blue-700" },
  "orientada al retorno":{ bg: "bg-amber-50",  text: "text-amber-700" },
};
