// Curated cascading location data — countries with strong padel scenes,
// their main padel cities, and well-known barrios/areas within each city.
// Keep lists tight so users connect on the same actual courts.

export type CityData = { name: string; areas: string[] };
export type CountryData = { name: string; cities: CityData[] };

export const LOCATION_DATA: CountryData[] = [
  {
    name: "Spain",
    cities: [
      { name: "Madrid", areas: ["Centro", "Salamanca", "Chamberí", "Chamartín", "Retiro", "Moncloa-Aravaca", "Aravaca", "Mirasierra", "Tetuán", "Arganzuela", "Latina", "Carabanchel", "Ciudad Lineal", "Arturo Soria", "Conde Orgaz", "Hortaleza", "San Blas-Canillejas", "Barajas", "La Moraleja", "Alcobendas", "San Sebastián de los Reyes", "Tres Cantos", "Las Rozas", "Majadahonda", "Pozuelo de Alarcón", "Boadilla del Monte", "Villanueva de la Cañada", "Villaviciosa de Odón"] },
      { name: "Barcelona", areas: ["Eixample", "Gràcia", "Sarrià-Sant Gervasi", "Les Corts", "Sant Martí", "Ciutat Vella", "Pedralbes", "Sant Cugat", "Castelldefels", "Sitges"] },
      { name: "Valencia", areas: ["Centro", "L'Eixample", "Campanar", "Benimaclet", "El Pla del Real", "Algirós", "Patacona"] },
      { name: "Málaga", areas: ["Centro", "Pedregalejo", "El Limonar", "Teatinos", "Churriana", "Marbella", "Estepona"] },
      { name: "Sevilla", areas: ["Centro", "Triana", "Nervión", "Los Remedios", "Bellavista"] },
      { name: "Bilbao", areas: ["Abando", "Indautxu", "Deusto", "Getxo"] },
      { name: "Mallorca", areas: ["Palma", "Port d'Andratx", "Pollença", "Alcúdia", "Sóller", "Manacor", "Calvià", "Inca"] },
      { name: "Menorca", areas: ["Maó (Mahón)", "Ciutadella", "Es Mercadal", "Fornells", "Sant Lluís", "Alaior"] },
    ],
  },
  {
    name: "Portugal",
    cities: [
      { name: "Lisboa", areas: ["Centro", "Belém", "Parque das Nações", "Cascais", "Estoril", "Oeiras", "Sintra"] },
      { name: "Porto", areas: ["Centro", "Foz do Douro", "Boavista", "Matosinhos", "Vila Nova de Gaia"] },
      { name: "Faro", areas: ["Centro", "Vilamoura", "Quinta do Lago", "Albufeira"] },
    ],
  },
  {
    name: "Italy",
    cities: [
      { name: "Milano", areas: ["Centro", "Brera", "Navigli", "Porta Romana", "Isola", "Città Studi", "San Siro"] },
      { name: "Roma", areas: ["Centro", "Parioli", "Prati", "EUR", "Trastevere", "Flaminio", "Appia"] },
      { name: "Torino", areas: ["Centro", "Crocetta", "San Salvario", "Lingotto"] },
      { name: "Bologna", areas: ["Centro", "Saragozza", "San Donato"] },
      { name: "Sicily", areas: ["Palermo", "Catania", "Taormina", "Siracusa", "Agrigento", "Trapani", "Messina", "Ragusa"] },
      { name: "Sardinia", areas: ["Cagliari", "Olbia", "Alghero", "Porto Cervo", "Costa Smeralda", "Pula", "Oristano"] },
    ],
  },
  {
    name: "France",
    cities: [
      { name: "Paris", areas: ["1er–4e (Centre)", "7e–8e", "15e", "16e", "17e", "Boulogne-Billancourt", "Neuilly", "Levallois"] },
      { name: "Lyon", areas: ["Presqu'île", "Croix-Rousse", "Part-Dieu", "Confluence"] },
      { name: "Marseille", areas: ["Vieux-Port", "Le Prado", "Cassis"] },
      { name: "Bordeaux", areas: ["Centre", "Chartrons", "Caudéran"] },
      { name: "Toulouse", areas: ["Capitole", "Saint-Cyprien", "Compans-Caffarelli"] },
    ],
  },
  {
    name: "United Kingdom",
    cities: [
      { name: "London", areas: ["Central", "Chelsea", "Kensington", "Notting Hill", "Hampstead", "Wimbledon", "Canary Wharf", "Shoreditch", "Battersea"] },
      { name: "Manchester", areas: ["City Centre", "Didsbury", "Salford"] },
    ],
  },
  {
    name: "Netherlands",
    cities: [
      { name: "Amsterdam", areas: ["Centrum", "Zuid", "Oost", "West", "Noord", "Amstelveen"] },
      { name: "Rotterdam", areas: ["Centrum", "Kralingen", "Hillegersberg"] },
      { name: "The Hague", areas: ["Centrum", "Scheveningen", "Wassenaar"] },
    ],
  },
  {
    name: "Sweden",
    cities: [
      { name: "Stockholm", areas: ["Östermalm", "Södermalm", "Vasastan", "Kungsholmen", "Bromma", "Solna", "Täby"] },
      { name: "Göteborg", areas: ["Centrum", "Majorna", "Hisingen"] },
      { name: "Malmö", areas: ["Centrum", "Västra Hamnen", "Limhamn"] },
    ],
  },
  {
    name: "Germany",
    cities: [
      { name: "Berlin", areas: ["Mitte", "Charlottenburg", "Kreuzberg", "Prenzlauer Berg", "Schöneberg"] },
      { name: "München", areas: ["Altstadt", "Schwabing", "Bogenhausen", "Sendling"] },
      { name: "Hamburg", areas: ["Altstadt", "Eppendorf", "Winterhude", "HafenCity"] },
    ],
  },
  {
    name: "Belgium",
    cities: [
      { name: "Brussels", areas: ["Centre", "Ixelles", "Uccle", "Woluwe"] },
      { name: "Antwerp", areas: ["Centrum", "Zuid", "Berchem"] },
    ],
  },
  {
    name: "Switzerland",
    cities: [
      { name: "Zürich", areas: ["Altstadt", "Enge", "Wiedikon", "Oerlikon"] },
      { name: "Genève", areas: ["Centre", "Eaux-Vives", "Champel", "Carouge"] },
    ],
  },
  {
    name: "Argentina",
    cities: [
      { name: "Buenos Aires", areas: ["Palermo", "Recoleta", "Belgrano", "Núñez", "Caballito", "Vicente López", "San Isidro", "Pilar", "Nordelta"] },
      { name: "Córdoba", areas: ["Centro", "Nueva Córdoba", "Cerro de las Rosas"] },
      { name: "Rosario", areas: ["Centro", "Fisherton", "Pichincha"] },
      { name: "Mar del Plata", areas: ["Centro", "Playa Grande", "Los Troncos"] },
    ],
  },
  {
    name: "Brazil",
    cities: [
      { name: "São Paulo", areas: ["Jardins", "Itaim Bibi", "Vila Olímpia", "Pinheiros", "Vila Madalena", "Moema", "Brooklin", "Morumbi", "Alphaville", "Tatuapé"] },
      { name: "Rio de Janeiro", areas: ["Ipanema", "Leblon", "Barra da Tijuca", "Copacabana", "Recreio", "Botafogo", "Jardim Botânico"] },
      { name: "Brasília", areas: ["Asa Sul", "Asa Norte", "Lago Sul", "Lago Norte"] },
      { name: "Belo Horizonte", areas: ["Savassi", "Lourdes", "Belvedere"] },
      { name: "Florianópolis", areas: ["Centro", "Jurerê", "Lagoa da Conceição"] },
      { name: "Curitiba", areas: ["Batel", "Água Verde", "Ecoville"] },
    ],
  },
  {
    name: "Mexico",
    cities: [
      { name: "Ciudad de México", areas: ["Polanco", "Condesa", "Roma", "Lomas", "Santa Fe", "Del Valle", "Coyoacán", "Interlomas"] },
      { name: "Monterrey", areas: ["San Pedro Garza García", "Valle Oriente", "Cumbres"] },
      { name: "Guadalajara", areas: ["Providencia", "Zapopan", "Chapalita"] },
    ],
  },
  {
    name: "Morocco",
    cities: [
      { name: "Casablanca", areas: ["Anfa", "Maarif", "Ain Diab", "Bouskoura", "Sidi Maarouf"] },
      { name: "Marrakech", areas: ["Hivernage", "Gueliz", "Palmeraie", "Agdal", "Sidi Ghanem"] },
      { name: "Rabat", areas: ["Agdal", "Hay Riad", "Souissi", "Hassan", "Ocean"] },
    ],
  },
  {
    name: "Colombia",
    cities: [
      { name: "Bogotá", areas: ["Chapinero", "Usaquén", "Chicó", "Rosales", "Cedritos"] },
      { name: "Medellín", areas: ["El Poblado", "Laureles", "Envigado"] },
    ],
  },
  {
    name: "Chile",
    cities: [
      { name: "Santiago", areas: ["Las Condes", "Vitacura", "Providencia", "Lo Barnechea", "Ñuñoa"] },
    ],
  },
  {
    name: "China",
    cities: [
      { name: "Shanghai", areas: ["The Bund", "Jing'an", "Xintiandi", "French Concession", "Lujiazui", "Gubei", "Hongqiao"] },
      { name: "Beijing", areas: ["Sanlitun", "Chaoyang Park", "Guomao", "Shunyi"] },
    ],
  },
  {
    name: "United States",
    cities: [
      { name: "Miami", areas: ["Brickell", "Coral Gables", "Coconut Grove", "Wynwood", "Aventura", "Doral", "Key Biscayne"] },
      { name: "New York City", areas: ["Manhattan", "Brooklyn", "Queens", "Long Island City", "Williamsburg", "Bronx", "Westchester", "Long Island", "Hamptons"] },
      { name: "Los Angeles", areas: ["Beverly Hills", "Santa Monica", "West Hollywood", "Pasadena", "Venice", "Manhattan Beach", "Culver City", "Downtown LA"] },
      { name: "San Francisco", areas: ["Downtown", "SoMa", "Mission", "Marina", "Pacific Heights", "Nob Hill", "Presidio"] },
      { name: "Silicon Valley / South Bay", areas: ["Palo Alto", "Mountain View", "Menlo Park", "Los Altos", "Sunnyvale", "Cupertino", "San Jose", "Redwood City", "Atherton"] },
      { name: "East Bay", areas: ["Berkeley", "Oakland", "Walnut Creek", "Lafayette", "Danville", "Pleasanton"] },
      { name: "San Diego", areas: ["Downtown", "La Jolla", "Del Mar", "Carmel Valley", "Encinitas", "Coronado", "Pacific Beach", "Rancho Santa Fe"] },
      { name: "Orange County", areas: ["Newport Beach", "Irvine", "Laguna Beach", "Huntington Beach", "Anaheim", "Costa Mesa"] },
      { name: "Sacramento", areas: ["Downtown", "East Sacramento", "Roseville", "Folsom", "Davis"] },
      { name: "Palm Springs", areas: ["Palm Springs", "Rancho Mirage", "Palm Desert", "La Quinta", "Indian Wells"] },
      { name: "Seattle", areas: ["Downtown", "Capitol Hill", "Ballard", "Queen Anne", "Bellevue", "Redmond", "Kirkland", "Mercer Island"] },
      { name: "Washington DC", areas: ["Georgetown", "Dupont Circle", "Capitol Hill", "Foggy Bottom", "Adams Morgan", "Navy Yard"] },
      { name: "Northern Virginia", areas: ["Arlington", "Alexandria", "Tysons", "McLean", "Reston", "Fairfax", "Vienna", "Ashburn"] },
      { name: "Virginia (other)", areas: ["Richmond", "Virginia Beach", "Norfolk", "Charlottesville"] },
      { name: "Boston", areas: ["Back Bay", "Beacon Hill", "Cambridge", "Brookline", "Newton", "Somerville"] },
      { name: "Chicago", areas: ["Loop", "River North", "Lincoln Park", "Wicker Park", "Gold Coast", "Evanston"] },
      { name: "Houston", areas: ["Downtown", "The Heights", "Memorial", "River Oaks", "Montrose"] },
      { name: "Dallas / Fort Worth", areas: ["Uptown", "Highland Park", "Plano", "Frisco", "Fort Worth", "Southlake"] },
      { name: "Austin", areas: ["Downtown", "South Congress", "Westlake", "East Austin", "Round Rock"] },
      { name: "Denver / Boulder", areas: ["Downtown Denver", "Cherry Creek", "LoDo", "Boulder", "Aspen", "Vail"] },
      { name: "Phoenix / Scottsdale", areas: ["Scottsdale", "Paradise Valley", "Downtown Phoenix", "Tempe", "Chandler"] },
      { name: "Las Vegas", areas: ["The Strip", "Summerlin", "Henderson"] },
      { name: "Atlanta", areas: ["Buckhead", "Midtown", "Alpharetta", "Sandy Springs"] },
      { name: "Nashville", areas: ["Downtown", "The Gulch", "Green Hills", "Franklin"] },
      { name: "Charlotte", areas: ["Uptown", "SouthPark", "Ballantyne"] },
      { name: "Raleigh / Durham", areas: ["Raleigh", "Durham", "Chapel Hill", "Cary"] },
      { name: "Orlando", areas: ["Downtown", "Winter Park", "Lake Nona", "Dr. Phillips"] },
      { name: "Tampa", areas: ["Downtown", "South Tampa", "St. Petersburg", "Clearwater"] },
      { name: "Naples / Fort Myers", areas: ["Naples", "Bonita Springs", "Fort Myers"] },
      { name: "Philadelphia", areas: ["Center City", "Rittenhouse", "Main Line", "University City"] },
      { name: "New Jersey", areas: ["Hoboken", "Jersey City", "Princeton", "Short Hills", "Montclair"] },
      { name: "Connecticut", areas: ["Greenwich", "Stamford", "Westport", "New Canaan"] },
      { name: "Minneapolis", areas: ["Downtown", "Uptown", "St. Paul", "Edina"] },
      { name: "Portland", areas: ["Pearl District", "Downtown", "Lake Oswego", "Beaverton"] },
      { name: "Salt Lake City", areas: ["Downtown", "Park City", "Sugar House"] },
      { name: "Detroit / Ann Arbor", areas: ["Downtown Detroit", "Birmingham", "Ann Arbor", "Bloomfield Hills"] },
      { name: "Honolulu", areas: ["Waikiki", "Kahala", "Kailua"] },
    ],
  },
  {
    name: "Canada",
    cities: [
      { name: "Toronto", areas: ["Downtown", "Yorkville", "Liberty Village", "North York"] },
      { name: "Montréal", areas: ["Plateau", "Westmount", "Outremont"] },
      { name: "Vancouver", areas: ["Downtown", "Kitsilano", "West Vancouver"] },
    ],
  },
  {
    name: "United Arab Emirates",
    cities: [
      { name: "Dubai", areas: ["Downtown", "Dubai Marina", "JBR", "Palm Jumeirah", "Jumeirah", "Business Bay", "Arabian Ranches", "Emirates Hills", "Dubai Hills", "Al Barsha"] },
      { name: "Abu Dhabi", areas: ["Corniche", "Al Reem Island", "Saadiyat Island", "Khalifa City", "Yas Island"] },
    ],
  },
  {
    name: "Saudi Arabia",
    cities: [
      { name: "Riyadh", areas: ["Olaya", "Al Malqa", "Diplomatic Quarter", "Hittin", "King Abdullah District", "Al Yasmin"] },
      { name: "Jeddah", areas: ["Al Hamra", "Al Shati", "Obhur", "Al Andalus", "Al Rawdah"] },
      { name: "Khobar", areas: ["Corniche", "Al Bandariyah", "Al Rakah"] },
      { name: "Dammam", areas: ["Al Faisaliyah", "Al Shati East", "Al Khalidiyah"] },
    ],
  },
  {
    name: "Qatar",
    cities: [
      { name: "Doha", areas: ["West Bay", "The Pearl", "Lusail", "Al Waab", "Katara", "Msheireb", "Al Sadd", "Wakra"] },
    ],
  },
  {
    name: "Bahrain",
    cities: [
      { name: "Manama", areas: ["Diplomatic Area", "Juffair", "Adliya", "Seef", "Amwaj Islands"] },
      { name: "Riffa", areas: ["East Riffa", "West Riffa", "Bukuwara"] },
    ],
  },
  {
    name: "Kuwait",
    cities: [
      { name: "Kuwait City", areas: ["Sharq", "Salmiya", "Jabriya", "Hawally", "Kaifan", "Shuwaikh", "Fahaheel"] },
      { name: "Al Jahra", areas: ["Al Naeem", "Al Qasr"] },
    ],
  },
  {
    name: "Oman",
    cities: [
      { name: "Muscat", areas: ["Shatti Al Qurum", "Al Khuwair", "Ghala", "Bawshar", "Seeb", "Muttrah"] },
      { name: "Salalah", areas: ["Al Saadah", "Al Wadi", "New Salalah"] },
    ],
  },
  {
    name: "Egypt",
    cities: [
      { name: "Cairo", areas: ["Zamalek", "Maadi", "New Cairo", "Sheikh Zayed", "6th of October"] },
    ],
  },
  {
    name: "Lebanon",
    cities: [
      { name: "Beirut", areas: ["Achrafieh", "Hamra", "Verdun", "Dbayeh", "Faqra"] },
    ],
  },
  {
    name: "Palestine",
    cities: [
      { name: "Ramallah", areas: ["Al-Masyoun", "Al-Irsal", "Al-Tireh"] },
      { name: "Gaza", areas: ["Rimal", "Al-Shati", "Al-Tuffah"] },
      { name: "Bethlehem", areas: ["Beit Jala", "Beit Sahour", "Old City"] },
      { name: "Hebron", areas: ["Old City", "H1 Area", "Al-Salam"] },
      { name: "Nablus", areas: ["Old City", "Rafidia", "Askar"] },
      { name: "Jenin", areas: ["Old City", "Al-Jabriyat"] },
      { name: "Jericho", areas: ["City Centre", "Aqabat Jaber"] },
    ],
  },
  {
    name: "Libya",
    cities: [
      { name: "Tripoli", areas: [] },
      { name: "Benghazi", areas: [] },
    ],
  },
  {
    name: "Norway",
    cities: [
      { name: "Oslo", areas: ["Sentrum", "Frogner", "Majorstuen", "Bærum"] },
    ],
  },
  {
    name: "Finland",
    cities: [
      { name: "Helsinki", areas: ["Centre", "Kallio", "Espoo"] },
    ],
  },
  {
    name: "Denmark",
    cities: [
      { name: "Copenhagen", areas: ["Indre By", "Frederiksberg", "Østerbro", "Hellerup"] },
    ],
  },
  {
    name: "Greece",
    cities: [
      { name: "Athens", areas: ["Kolonaki", "Glyfada", "Kifisia", "Marousi"] },
      { name: "Crete", areas: ["Chania", "Heraklion", "Rethymno", "Agios Nikolaos", "Elounda", "Platanias", "Malia"] },
    ],
  },
  {
    name: "Hong Kong",
    cities: [
      { name: "Hong Kong", areas: ["Central", "Mid-Levels", "Repulse Bay", "Stanley", "Kowloon", "Tsim Sha Tsui", "Clear Water Bay", "Sai Kung"] },
    ],
  },
  {
    name: "Japan",
    cities: [
      { name: "Tokyo", areas: ["Shibuya", "Shinjuku", "Roppongi", "Azabu", "Meguro", "Minato", "Setagaya", "Omotesando", "Aoyama", "Ebisu"] },
      { name: "Osaka", areas: ["Umeda", "Namba", "Shinsaibashi"] },
    ],
  },
  {
    name: "Tunisia",
    cities: [
      { name: "Tunis", areas: ["La Marsa", "Carthage", "Sidi Bou Said", "Les Berges du Lac", "Gammarth", "Ariana", "Lac"] },
    ],
  },
  {
    name: "Turkey",
    cities: [
      { name: "Istanbul", areas: ["Beşiktaş", "Nişantaşı", "Etiler", "Kadıköy", "Zekeriyaköy"] },
    ],
  },
  {
    name: "Australia",
    cities: [
      { name: "Sydney", areas: ["CBD", "Bondi", "Manly", "North Shore"] },
      { name: "Melbourne", areas: ["CBD", "South Yarra", "Brighton"] },
    ],
  },
  {
    name: "Singapore",
    cities: [
      { name: "Singapore", areas: ["Orchard", "Tanglin", "Bukit Timah", "Sentosa", "East Coast"] },
    ],
  },
];

export const COUNTRY_NAMES = LOCATION_DATA.map((c) => c.name);

export function citiesFor(country: string): CityData[] {
  return LOCATION_DATA.find((c) => c.name === country)?.cities ?? [];
}
export function areasFor(country: string, city: string): string[] {
  return citiesFor(country).find((c) => c.name === city)?.areas ?? [];
}
