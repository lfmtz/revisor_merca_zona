export interface EstadoMexico {
  nombre: string;
  abreviaturas: string[];
  lat: number;
  lng: number;
  zoom: number;
  municipios: string[];
  codigo_postal_prefijos: string[];
}

export const ESTADOS_MEXICO: string[] = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "México",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas"
];

export const ESTADOS_DATA: Record<string, EstadoMexico> = {
  "Aguascalientes": {
    nombre: "Aguascalientes",
    abreviaturas: ["Ags", "AGS"],
    lat: 21.8853,
    lng: -102.2916,
    zoom: 11,
    municipios: ["Aguascalientes", "Jesús María", "Calvillo", "Rincón de Romos", "Pabellón de Arteaga", "San Francisco de los Romo"],
    codigo_postal_prefijos: ["20"]
  },
  "Baja California": {
    nombre: "Baja California",
    abreviaturas: ["BC", "B.C."],
    lat: 32.5149,
    lng: -117.0382,
    zoom: 9,
    municipios: ["Tijuana", "Mexicali", "Ensenada", "Playas de Rosarito", "Tecate", "San Quintín", "San Felipe"],
    codigo_postal_prefijos: ["21", "22"]
  },
  "Baja California Sur": {
    nombre: "Baja California Sur",
    abreviaturas: ["BCS", "B.C.S."],
    lat: 24.1426,
    lng: -110.3128,
    zoom: 8,
    municipios: ["La Paz", "Los Cabos", "Cabo San Lucas", "San José del Cabo", "Comondú", "Loreto", "Mulegé"],
    codigo_postal_prefijos: ["23"]
  },
  "Campeche": {
    nombre: "Campeche",
    abreviaturas: ["Camp", "Camp."],
    lat: 19.8301,
    lng: -90.5349,
    zoom: 9,
    municipios: ["Campeche", "Carmen", "Champotón", "Escárcega", "Calkiní", "Hecelchakán"],
    codigo_postal_prefijos: ["24"]
  },
  "Chiapas": {
    nombre: "Chiapas",
    abreviaturas: ["Chis", "Chis."],
    lat: 16.7569,
    lng: -93.1292,
    zoom: 9,
    municipios: ["Tuxtla Gutiérrez", "Tapachula", "San Cristóbal de las Casas", "Comitán de Domínguez", "Chiapa de Corzo", "Palenque", "Villaflores"],
    codigo_postal_prefijos: ["29", "30"]
  },
  "Chihuahua": {
    nombre: "Chihuahua",
    abreviaturas: ["Chih", "Chih."],
    lat: 28.6330,
    lng: -106.0691,
    zoom: 8,
    municipios: ["Chihuahua", "Juárez", "Ciudad Juárez", "Cuauhtémoc", "Delicias", "Hidalgo del Parral", "Nuevo Casas Grandes", "Camargo"],
    codigo_postal_prefijos: ["31", "32", "33"]
  },
  "Ciudad de México": {
    nombre: "Ciudad de México",
    abreviaturas: ["CDMX", "C.D.M.X.", "DF", "D.F."],
    lat: 19.4326,
    lng: -99.1332,
    zoom: 12,
    municipios: [
      "Cuauhtémoc", "Benito Juárez", "Miguel Hidalgo", "Coyoacán",
      "Iztapalapa", "Gustavo A. Madero", "Álvaro Obregón", "Tlalpan",
      "Venustiano Carranza", "Azcapotzalco", "Iztacalco", "Xochimilco",
      "Cuajimalpa de Morelos", "La Magdalena Contreras", "Tláhuac", "Milpa Alta"
    ],
    codigo_postal_prefijos: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16"]
  },
  "Coahuila": {
    nombre: "Coahuila",
    abreviaturas: ["Coah", "Coah."],
    lat: 25.4383,
    lng: -100.9737,
    zoom: 8,
    municipios: ["Saltillo", "Torreón", "Monclova", "Piedras Negras", "Acuña", "Ramos Arizpe", "Matamoros", "Frontera"],
    codigo_postal_prefijos: ["25", "26", "27"]
  },
  "Colima": {
    nombre: "Colima",
    abreviaturas: ["Col", "Col."],
    lat: 19.2452,
    lng: -103.7241,
    zoom: 11,
    municipios: ["Colima", "Manzanillo", "Villa de Álvarez", "Tecomán", "Armería", "Comala"],
    codigo_postal_prefijos: ["28"]
  },
  "Durango": {
    nombre: "Durango",
    abreviaturas: ["Dgo", "Dgo."],
    lat: 24.0277,
    lng: -104.6532,
    zoom: 9,
    municipios: ["Durango", "Gómez Palacio", "Lerdo", "Pueblo Nuevo", "Santiago Papasquiaro", "El Salto"],
    codigo_postal_prefijos: ["34", "35"]
  },
  "Guanajuato": {
    nombre: "Guanajuato",
    abreviaturas: ["Gto", "Gto."],
    lat: 21.0190,
    lng: -101.2574,
    zoom: 10,
    municipios: ["León", "Irapuato", "Celaya", "Salamanca", "Guanajuato", "San Miguel de Allende", "Silao", "Dolores Hidalgo"],
    codigo_postal_prefijos: ["36", "37", "38"]
  },
  "Guerrero": {
    nombre: "Guerrero",
    abreviaturas: ["Gro", "Gro."],
    lat: 16.8531,
    lng: -99.8237,
    zoom: 9,
    municipios: ["Acapulco de Juárez", "Chilpancingo de los Bravo", "Iguala de la Independencia", "Zihuatanejo de Azueta", "Taxco de Alarcón", "Tlapa de Comonfort"],
    codigo_postal_prefijos: ["39", "40", "41"]
  },
  "Hidalgo": {
    nombre: "Hidalgo",
    abreviaturas: ["Hgo", "Hgo."],
    lat: 20.1011,
    lng: -98.7591,
    zoom: 10,
    municipios: ["Pachuca de Soto", "Mineral de la Reforma", "Tulancingo de Bravo", "Tula de Allende", "Tizayuca", "Huejutla de Reyes", "Ixmiquilpan"],
    codigo_postal_prefijos: ["42", "43"]
  },
  "Jalisco": {
    nombre: "Jalisco",
    abreviaturas: ["Jal", "Jal."],
    lat: 20.6597,
    lng: -103.3496,
    zoom: 10,
    municipios: ["Guadalajara", "Zapopan", "San Pedro Tlaquepaque", "Tonalá", "Tlajomulco de Zúñiga", "Puerto Vallarta", "El Salto", "Lagos de Moreno", "Tepatitlán de Morelos", "Ciudad Guzmán"],
    codigo_postal_prefijos: ["44", "45", "46", "47", "48", "49"]
  },
  "México": {
    nombre: "México",
    abreviaturas: ["Edomex", "EdoMex", "Edo. Méx.", "Estado de México"],
    lat: 19.2826,
    lng: -99.6557,
    zoom: 10,
    municipios: [
      "Ecatepec de Morelos", "Nezahualcóyotl", "Toluca", "Naucalpan de Juárez",
      "Tlalnepantla de Baz", "Chimalhuacán", "Cuautitlán Izcalli", "Atizapán de Zaragoza",
      "Tultitlán", "Ixtapaluca", "Nicolás Romero", "Tecámac", "Valle de Chalco", "Metepec",
      "Chalco", "Coacalco de Berriozábal", "Huixquilucan", "Texcoco"
    ],
    codigo_postal_prefijos: ["50", "51", "52", "53", "54", "55", "56", "57"]
  },
  "Michoacán": {
    nombre: "Michoacán",
    abreviaturas: ["Mich", "Mich."],
    lat: 19.7060,
    lng: -101.1950,
    zoom: 9,
    municipios: ["Morelia", "Uruapan", "Zamora", "Lázaro Cárdenas", "Zitácuaro", "Apatzingán", "Hidalgo", "Pátzcuaro", "La Piedad"],
    codigo_postal_prefijos: ["58", "59", "60", "61"]
  },
  "Morelos": {
    nombre: "Morelos",
    abreviaturas: ["Mor", "Mor."],
    lat: 18.9242,
    lng: -99.2216,
    zoom: 11,
    municipios: ["Cuernavaca", "Jiutepec", "Cuautla", "Temixco", "Yautepec", "Emiliano Zapata", "Xochitepec"],
    codigo_postal_prefijos: ["62"]
  },
  "Nayarit": {
    nombre: "Nayarit",
    abreviaturas: ["Nay", "Nay."],
    lat: 21.5039,
    lng: -104.8946,
    zoom: 10,
    municipios: ["Tepic", "Bahía de Banderas", "Nuevo Nayarit", "Compostela", "Santiago Ixcuintla", "Xalisco", "San Blas"],
    codigo_postal_prefijos: ["63"]
  },
  "Nuevo León": {
    nombre: "Nuevo León",
    abreviaturas: ["NL", "N.L."],
    lat: 25.6866,
    lng: -100.3161,
    zoom: 10,
    municipios: ["Monterrey", "Guadalupe", "San Nicolás de los Garza", "Apodaca", "General Escobedo", "Santa Catarina", "San Pedro Garza García", "Juárez", "Cadereyta Jiménez", "Santiago"],
    codigo_postal_prefijos: ["64", "65", "66", "67"]
  },
  "Oaxaca": {
    nombre: "Oaxaca",
    abreviaturas: ["Oax", "Oax."],
    lat: 17.0732,
    lng: -96.7266,
    zoom: 9,
    municipios: ["Oaxaca de Juárez", "San Juan Bautista Tuxtepec", "Juchitán de Zaragoza", "Santa Cruz Xoxocotlán", "Salina Cruz", "Puerto Escondido", "Huatulco", "Santo Domingo Tehuantepec"],
    codigo_postal_prefijos: ["68", "69", "70", "71"]
  },
  "Puebla": {
    nombre: "Puebla",
    abreviaturas: ["Pue", "Pue."],
    lat: 19.0414,
    lng: -98.2063,
    zoom: 10,
    municipios: ["Puebla", "Tehuacán", "San Martín Texmelucan", "San Andrés Cholula", "San Pedro Cholula", "Atlixco", "Amozoc", "Huauchinango", "Teziutlán"],
    codigo_postal_prefijos: ["72", "73", "74", "75"]
  },
  "Querétaro": {
    nombre: "Querétaro",
    abreviaturas: ["Qro", "Qro."],
    lat: 20.5888,
    lng: -100.3899,
    zoom: 11,
    municipios: ["Santiago de Querétaro", "San Juan del Río", "El Marqués", "Corregidora", "Tequisquiapan", "Cadereyta de Montes", "Pedro Escobedo", "Huimilpan"],
    codigo_postal_prefijos: ["76"]
  },
  "Quintana Roo": {
    nombre: "Quintana Roo",
    abreviaturas: ["QRoo", "Q. Roo", "Q.R."],
    lat: 21.1619,
    lng: -86.8515,
    zoom: 9,
    municipios: ["Benito Juárez", "Cancún", "Solidaridad", "Playa del Carmen", "Othón P. Blanco", "Chetumal", "Tulum", "Cozumel", "Isla Mujeres"],
    codigo_postal_prefijos: ["77"]
  },
  "San Luis Potosí": {
    nombre: "San Luis Potosí",
    abreviaturas: ["SLP", "S.L.P."],
    lat: 22.1565,
    lng: -100.9855,
    zoom: 9,
    municipios: ["San Luis Potosí", "Soledad de Graciano Sánchez", "Ciudad Valles", "Matehuala", "Rioverde", "Tamazunchale", "Mexquitic de Carmona"],
    codigo_postal_prefijos: ["78", "79"]
  },
  "Sinaloa": {
    nombre: "Sinaloa",
    abreviaturas: ["Sin", "Sin."],
    lat: 24.8091,
    lng: -107.3940,
    zoom: 9,
    municipios: ["Culiacán", "Mazatlán", "Ahome", "Los Mochis", "Guasave", "Navolato", "El Fuerte", "Salvador Alvarado", "Guamúchil"],
    codigo_postal_prefijos: ["80", "81", "82"]
  },
  "Sonora": {
    nombre: "Sonora",
    abreviaturas: ["Son", "Son."],
    lat: 29.0729,
    lng: -110.9559,
    zoom: 8,
    municipios: ["Hermosillo", "Cajeme", "Ciudad Obregón", "Nogales", "San Luis Río Colorado", "Navojoa", "Guaymas", "Puerto Peñasco", "Agua Prieta"],
    codigo_postal_prefijos: ["83", "84", "85"]
  },
  "Tabasco": {
    nombre: "Tabasco",
    abreviaturas: ["Tab", "Tab."],
    lat: 17.9892,
    lng: -92.9281,
    zoom: 10,
    municipios: ["Centro", "Villahermosa", "Cárdenas", "Comalcalco", "Huimanguillo", "Macuspana", "Cunduacán", "Paraíso"],
    codigo_postal_prefijos: ["86"]
  },
  "Tamaulipas": {
    nombre: "Tamaulipas",
    abreviaturas: ["Tamps", "Tamps."],
    lat: 23.7369,
    lng: -99.1411,
    zoom: 8,
    municipios: ["Reynosa", "Matamoros", "Nuevo Laredo", "Victoria", "Ciudad Victoria", "Tampico", "Ciudad Madero", "Altamira", "El Mante", "Río Bravo"],
    codigo_postal_prefijos: ["87", "88", "89"]
  },
  "Tlaxcala": {
    nombre: "Tlaxcala",
    abreviaturas: ["Tlax", "Tlax."],
    lat: 19.3182,
    lng: -98.2375,
    zoom: 11,
    municipios: ["Tlaxcala", "Apizaco", "Huamantla", "Chiautempan", "San Pablo del Monte", "Zacatelco", "Calpulalpan"],
    codigo_postal_prefijos: ["90"]
  },
  "Veracruz": {
    nombre: "Veracruz",
    abreviaturas: ["Ver", "Ver."],
    lat: 19.1738,
    lng: -96.1342,
    zoom: 8,
    municipios: ["Veracruz", "Xalapa", "Coatzacoalcos", "Córdoba", "Poza Rica de Hidalgo", "Boca del Río", "Orizaba", "Minatitlán", "Tuxpan", "Papantla", "San Andrés Tuxtla"],
    codigo_postal_prefijos: ["91", "92", "93", "94", "95", "96"]
  },
  "Yucatán": {
    nombre: "Yucatán",
    abreviaturas: ["Yuc", "Yuc."],
    lat: 20.9674,
    lng: -89.5926,
    zoom: 10,
    municipios: ["Mérida", "Kanasín", "Valladolid", "Tizimín", "Progreso", "Umán", "Tekax", "Motul", "Ticul"],
    codigo_postal_prefijos: ["97"]
  },
  "Zacatecas": {
    nombre: "Zacatecas",
    abreviaturas: ["Zac", "Zac."],
    lat: 22.7709,
    lng: -102.5832,
    zoom: 9,
    municipios: ["Zacatecas", "Guadalupe", "Fresnillo", "Jerez", "Río Grande", "Sombrerete", "Nochistlán", "Calera"],
    codigo_postal_prefijos: ["98", "99"]
  }
};
