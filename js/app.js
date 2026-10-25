/* Burgos Gastro House — carta + pedido WhatsApp */
(function () {
  "use strict";

  const WHATSAPP_NUMBER = "573023722712";
  const ORDER_STORAGE_KEY = "burgos-order-v1";
  const BUSINESS = {
    hoursLabel: "Lun–Jue 6:00 p.m.–10:30 p.m. · Vie–Dom y festivos 6:00 p.m.–11:00 p.m.",
    openTime: { h: 18, m: 0 },
    weekdayClose: { h: 22, m: 30 }, /* Lun–Jue */
    weekendClose: { h: 23, m: 0 }, /* Vie–Dom y festivos */
    tz: "America/Bogota",
    /* Festivos Colombia 2026 (fecha de descanso) */
    holidays: [
      "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
      "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
      "2026-07-13", "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12",
      "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25"
    ]
  };

  const IMG = {
    entrada1: "https://image.qwenlm.ai/public_source/c9e86078-3af8-4876-82b8-2eebaa83cc17/1c81b404f-6a3e-4ad1-b8a7-6e0de40d9e1c.webp",
    entrada2: "https://image.qwenlm.ai/public_source/c9e86078-3af8-4876-82b8-2eebaa83cc17/175a6405d-f6b4-451a-93ef-a5e5c6542e01.webp",
    entrada3: "https://image.qwenlm.ai/public_source/c9e86078-3af8-4876-82b8-2eebaa83cc17/14b449831-25aa-4c24-b5ab-8bee12281268.webp"
  };

  /* ---------- HELPERS ---------- */
  const parsePrice = (raw) => {
    if (raw == null || raw === "") return 0;
    if (typeof raw === "number") return Math.round(raw);
    const digits = String(raw).replace(/[^\d]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  };

  const formatPrice = (value) => {
    const n = typeof value === "number" ? value : parsePrice(value);
    if (!n) return "";
    return "$" + n.toLocaleString("es-CO");
  };

  const normalizePrice = (raw) => formatPrice(parsePrice(raw)) || String(raw || "");

  const escapeHtml = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const escapeAttr = (value = "") => String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  const uid = () => "o" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const greeting = () => {
    try {
      const hour = Number(
        new Intl.DateTimeFormat("es-CO", { hour: "numeric", hour12: false, timeZone: BUSINESS.tz }).format(new Date())
      );
      if (hour < 12) return "Buenos días";
      if (hour < 19) return "Buenas tardes";
      return "Buenas noches";
    } catch {
      return "Hola";
    }
  };

  const isOpenNow = () => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: BUSINESS.tz,
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      }).formatToParts(new Date());
      const get = (type) => parts.find((p) => p.type === type)?.value;
      const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const day = map[get("weekday")];
      let hour = Number(get("hour"));
      if (hour === 24) hour = 0;
      const minute = Number(get("minute"));
      const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
      const isHoliday = BUSINESS.holidays.includes(dateKey);
      const weekendHours = isHoliday || day === 0 || day === 5 || day === 6;
      const close = weekendHours ? BUSINESS.weekendClose : BUSINESS.weekdayClose;
      const nowMin = hour * 60 + minute;
      const openMin = BUSINESS.openTime.h * 60 + BUSINESS.openTime.m;
      const closeMin = close.h * 60 + close.m;
      return nowMin >= openMin && nowMin < closeMin;
    } catch {
      return true;
    }
  };

  const whatsappUrl = (text) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

  const helloWhatsAppUrl = () => whatsappUrl(`${greeting()}, quiero hacer un pedido en Burgos Gastro House.`);

  const sizes = (simple, doble) => [
    { id: "simple", label: "Simple", price: normalizePrice(simple), priceValue: parsePrice(simple) },
    { id: "doble", label: "Doble carne", price: normalizePrice(doble), priceValue: parsePrice(doble) }
  ];

  const ALL = [];
  const reg = (o) => {
    const item = {
      ...o,
      price: normalizePrice(o.price),
      priceValue: parsePrice(o.price),
      img: o.img || ""
    };
    ALL.push(item);
    return item;
  };
  const idxOf = (o) => ALL.indexOf(o);

  const DALE_PODER = {
    label: "Dale Poder a tus Papas",
    price: "$5.000",
    description: "Añade a tus papas tocineta ahumada, salsa de la casa, salsa de queso cheddar y queso campesino rayado."
  };

  /* ---------- MENU ---------- */
  const MENU = {
    burgers: {
      label: "HAMBURGUESAS",
      type: "cards",
      showDalePoder: true,
      photo: [
        reg({
          n: "01",
          name: "LA IMPERIAL",
          price: "$35.000",
          tag: "GANADORA DEL BURGER MASTER 2026",
          img: "img/hamburguesas/Imperial3.webp",
          desc: "<strong>Ganadora del Burger Master 2026</strong><br>- Pan brioche sellado con mantequilla<br>- 150gr de carne al carbón<br>- Dip de queso de hoja y parmesano<br>- Mermelada de tomate aromatizada con romero<br>- Bocaditos de panceta ahumada<br>- Cebolla crispy<br>- Salsa alemana<br>- Lechuga romana",
          sizes: sizes("$34.000", "$42.500")
        }),
        reg({
          n: "02",
          name: "SIBARITA",
          price: "$35.000",
          tag: " GANADORA DEL BURGER MASTER 2025",
          warningTag: "CONTIENE MANÍ",
          img: "img/hamburguesas/Sibarita.webp",
          desc: "<strong>Ganadora del Burger Master 2025</strong><br>150g de carne al carbón, tiras de pechuga con pesto italiano, cheddar y mozzarella, tocineta ahumada, pimentones asados caramelizados, vegetales frescos, tomate, lechuga romana y pan brioche asado en mantequilla.",
          sizes: sizes("$34.000", "$42.500")
        }),
        reg({
          n: "03",
          name: "PULLED BELLY",
          price: "$32.000",
          img: "img/hamburguesas/Pulled.webp",
          desc: "Pan brioche, 150g carne al carbón, dip de queso de hoja y parmesano, pulled pork en BBQ acevichado, aros de cebolla crujientes, tomate y lechuga romana.",
          sizes: sizes("$31.000", "$39.500")
        }),
        reg({
          n: "04",
          name: "BURGOS TRUFFEL",
          price: "$31.00",
          img: "img/hamburguesas/Truffel.webp",
          desc: "Pan brioche, carne al carbón, pollo en crema de trufa, tocineta ahumada, mezcla de quesos, cebolla fresca, lechuga romana y tomate fresco.",
          sizes: sizes("$28.900", "$37.400")
        }),
        reg({
          n: "05",
          name: "PAMPA BURGER",
          price: "$28.000",
          img: "img/hamburguesas/Pampa.webp",
          desc: "Pan brioche, carne al carbón, chorizo a la parrilla, queso cheddar, champiñones salteados al orégano, tomate fresco y lechuga romana.",
          sizes: sizes("$25.900", "$34.400")
        }),
        reg({
          n: "06",
          name: "ONION & BACON",
          price: "$27.000",
          img: "img/hamburguesas/Onion.webp",
          desc: "Pan brioche, carne al carbón, 2 tocinetas ahumadas, mezcla de quesos, aros de cebolla apanados, BBQ de cerveza negra y chipotle, lechuga romana y tomate fresco.",
          sizes: sizes("$25.500", "$34.000")
        }),
        reg({
          n: "07",
          name: "SANTERA BURGOS",
          price: "$27.000",
          img: "img/hamburguesas/Santera.webp",
          desc: "Pan brioche, carne al carbón, mermelada de chorizo en reducción de panela, queso campesino, cebolla fresca, tomate fresco y lechuga romana.",
          sizes: sizes("$24.900", "$33.400")
        }),
        reg({
          n: "08",
          name: "CLASSIC BURGOS",
          price: "$24.000",
          img: "img/hamburguesas/Clasic.webp",
          desc: "Pan brioche, carne al carbón, tocineta ahumada, mezcla de quesos, tomate, lechuga romana y opción a elegir.",
          sizes: sizes("$21.900", "$30.400"),
          choices: [
            {
              id: "topping",
              label: "Elige tu opción",
              required: true,
              values: ["Cebolla confitada", "Cebolla fresca", "Pepinillos agridulces", "Jalapeños", "Ninguna"]
            }
          ]
        })
      ]
    },

    Entradas: {
      label: "ENTRADAS",
      type: "cards",
      photo: [
        reg({ n: "01", name: "CHICKEN FINGERS", price: "$18.000", img: IMG.entrada1, desc: "Cuatro deditos de pollo apanados en cereal, acompañados de papa a la francesa." }),
        reg({ n: "02", name: "BACON CHEESE FRIES", price: "$14.000", img: IMG.entrada2, desc: "Papa criolla, tocineta y mix de quesos sabana y parmesano gratinado." }),
        reg({ n: "03", name: "CHORIZOS BURGOS", price: "$15.000", img: IMG.entrada3, desc: "Dos chorizos de cerdo a la parrilla, caramelizados en melao de piña y acompañados de papa en casco con queso rallado." })
      ]
    },

    la_bisteca: {
      label: "LA BISTECA",
      type: "cards",
      showDalePoder: true,
      photo: [
        reg({
          n: "01",
          name: "PICADA AL ESTILO BURGOS (PARA DOS)",
          price: "$65.000",
          tag: "RECOMENDADO",
          img: "img/LaBisteca/picada.webp",
          desc: "200gr de carne de res ahumada al carbón, 200gr de filete de pechuga ahumada al carbón, chorizo de ternera, cascos de papa rústica, yuca frita, arepa amarilla y ensalada de la casa."
        }),
        reg({
          n: "02",
          name: "ENTRECOT (CHATAS)",
          price: "$45.000",
          img: "img/LaBisteca/Entrecot.webp",
          desc: "Corte francés del costillar de la res (350 gr) a la parrilla, acompañado de cascos de papas criollas y ensalada de la casa.",
          choices: [
            {
              id: "termino",
              label: "Elige tu término",
              required: true,
              values: ["Tres cuartos", "Término medio", "Bien asado"]
            }
          ]
        }),
        reg({
          n: "03",
          name: "LOMO FINO EN SALSA DE CHAMPIÑONES",
          price: "$45.000",
          img: "img/LaBisteca/LomoFino.webp",
          desc: "250gr de lomo fino en salsa de champiñones al vino, acompañado de ensalada de la casa y papa en casco."
        }),
        reg({
          n: "04",
          name: "COSTILLAS BBQ",
          price: "$45.000",
          img: "img/LaBisteca/Costillas.webp",
          desc: "400gr de costillas de cerdo ahumadas, reducidas en BBQ de cerveza negra y chipotle, acompañadas de cascos de papa rústica y ensalada de la casa."
        }),
        reg({
          n: "05",
          name: "COMBINADO BURGOS",
          price: "$42.000",
          img: "img/LaBisteca/Combinado.webp",
          desc: "130gr de chatas, 120gr filete de pechuga, 2 chorizos de cerdo, acompañado de cascos de papa rústica y ensalada de la casa. (Combínalo a tu gusto)."
        }),
        reg({
          n: "06",
          name: "SUPREMA NAPOLITANA",
          price: "$40.000",
          img: "img/LaBisteca/Suprema.webp",
          desc: "300gr de suprema de pollo con salsa napolitana y queso gouda, acompañado de ensalada de la casa y papa en casco."
        }),
        reg({
          n: "07",
          name: "CORDON BLEU",
          price: "$40.000",
          img: "img/LaBisteca/CordonBleu.webp",
          desc: "Suprema de pollo rellena de jamón dulce y queso sabana, asada a la parrilla con salsa carbonara, sobre puré de tres papas y ensalada de la casa."
        }),
        reg({
          n: "08",
          name: "ALAS GLASEADAS",
          price: "$32.000",
          img: "img/LaBisteca/Alitas.webp",
          desc: "10 piezas de alas glaseadas en salsa mostaza, frutos amarillos y chile dulce o BBQ de cerveza negra, acompañadas de papa rústica."
        })
      ]
    },

    Adicionales: {
      label: "ADICIONALES",
      type: "list2col",
      cols: [
        [
          reg({ n: "01", name: "CARNE DE HAMBURGUESA 150GR MAS QUESO", price: "$10.000" }),
          reg({ n: "02", name: "CARNE DE RES A LA PARRILLA", price: "8.000" }),
          reg({ n: "03", name: "POLLO EN CREMA DE TRUFA BLANCA", price: "$7.000" }),
          reg({ n: "04", name: "FILETE DE PECHUGA", price: "$7.000" }),
          reg({ n: "05", name: "CHORIZO A LA PARRILLA", price: "$4.000" }),
          reg({ n: "06", name: "MERMELADA DE CHORIZO", price: "$4.000" }),
          reg({ n: "07", name: "TOCINETA AHUMADA X2", price: "$5.000" }),
          reg({ n: "08", name: "SALCHICHA", price: "$6.000" })
        ],
        [
          reg({ n: "09", name: "PULLED PORK", price: "$7.000" }),
          reg({ n: "10", name: "PAPA A LA FRANCESA 150GR", price: "$7.000" }),
          reg({ n: "11", name: "AROS DE CEBOLLA APANADOS X2", price: "$5.000" }),
          reg({ n: "12", name: "JALAPEÑOS", price: "$3.000" }),
          reg({ n: "13", name: "PEPINILLOS", price: "$3.500" }),
          reg({ n: "14", name: "MAÍZ 180GR", price: "$5.000" }),
          reg({
            n: "15",
            name: "DALE PODER A TUS PAPAS",
            price: DALE_PODER.price,
            desc: DALE_PODER.description
          })
        ]
      ]
    },

    papas: {
      label: "PAPAS BURGOS HOUSE",
      type: "cards",
      showDalePoder: true,
      photo: [
        reg({
          n: "01",
          name: "BURGOS FRIES",
          price: "$33.000",
          tag: "RECOMENDADO",
          img: "img/Papas/Burgos_fries.webp",
          desc: "300gr de papa rústica, carne al carbón, pollo en crema de trufa, chorizo de ternera, tocineta ahumada, queso campesino, salsa de la casa y salsa BBQ en reducción de cerveza negra."
        }),
        reg({
          n: "02",
          name: "BURGOS FRIES (PARA DOS)",
          price: "$43.000",
          img: "img/Papas/Burgos_fries.webp",
          desc: "450gr de papa rústica, carne al carbón, pollo en crema de trufa, chorizo de ternera, tocineta ahumada, queso campesino, salsa de la casa y salsa BBQ en reducción de cerveza negra."
        }),
        reg({
          n: "03",
          name: "CHICKEN FRIES",
          price: "$28.000",
          img: "img/Papas/Chicken_fries.webp",
          desc: "300gr de papa rústica, pollo apanado, tocineta ahumada, queso campesino y salsa de la casa."
        }),
        reg({
          n: "04",
          name: "SALCHI CHORI FRIES",
          price: "$24.000",
          img: "",
          desc: "300gr de papa rústica, salchicha tipo americana y chorizo de ternera, salsa de queso cheddar, salsa de la casa y queso campesino."
        })
      ]
    },

    maicitos: {
      label: "MAICITOS",
      type: "cards",
      showDalePoder: true,
      photo: [
        reg({
          n: "01",
          name: "DESGRANADO PORTO",
          price: "$33.000",
          img: "img/maicitos/Porto.webp",
          desc: "Maíz tierno, chorizo, pollo desmechado, champiñones, crema de leche gratinado con queso sabana y parmesano, acompañado de papa rústica y salsa de la casa."
        }),
        reg({
          n: "02",
          name: "DESGRANADO PARRILLERO",
          price: "$29.000",
          img: "img/maicitos/Parrillero.webp",
          desc: "Maíz tierno, filete de pechuga y res, tocineta ahumada, salsa de queso cheddar, queso campesino, acompañado de papa rústica y salsa de la casa."
        })
      ]
    },

    Cocteles: {
      label: "COCTELES",
      type: "cards",
      photo: [
        reg({ n: "01", name: "TIKI BURGOS", price: "$21.000", img: "img/Cocteles/Tiki.webp", desc: "Whiskey, triple sec, ron, miel de agave, lulo, jugo de naranja, piña y zumo de limón." }),
        reg({ n: "02", name: "PIÑA COLADA", price: "$21.000", img: "img/Cocteles/colada.webp", desc: "Ron, piña y crema de coco." }),
        reg({ n: "03", name: "TINTO DE VERANO", price: "$19.000", img: "img/Cocteles/Tinto.webp", desc: "Vino tinto cabernet sauvignon, soda bretaña y limón." }),
        reg({ n: "04", name: "TOMMY’S MARGARITA", price: "$19.000", img: "img/Cocteles/Margarita.webp", desc: "Tequila, jugo de naranja, zumo de limón, miel de agave y tajín." }),
        reg({ n: "05", name: "MOJITO TENTATION", price: "$19.000", img: "img/Cocteles/Mojito.webp", desc: "Ron, soda bretaña, zumo de limón, hierbabuena y almíbar." }),
        reg({ n: "06", name: "PINK DAIQUIRI", price: "$18.000", img: "img/Cocteles/pink.webp", desc: "Ron, fresa, azúcar y limón." }),
        reg({ n: "07", name: "PALOMA FRESH", price: "$18.000", img: "img/Cocteles/paloma2.webp", desc: "Tequila, jugo de toronja, zumo de limón y tajín." })
      ]
    },

    Bebidas: {
      label: "BEBIDAS",
      type: "beverages",
      groups: [
        {
          title: "SODA FRUTALES",
          items: [
            reg({
              n: "01",
              name: "SODA JAMAIQUINA",
              price: "$13.000",
              img: "img/bebidas/sodas/Jamaiquina.webp",
              desc: "Soda bretaña con reducción de flor de Jamaica, jugo de arándanos, canela y limón."
            }),
            reg({
              n: "02",
              name: "SODA PRIMAVERAL",
              price: "$13.000",
              img: "",
              desc: "Soda bretaña con reducción de uchuva, naranja, piña y limón."
            })
          ]
        },
        {
          title: "LIMONADAS",
          items: [
            reg({ n: "03", name: "LIMONADA DE COCO", price: "$14.000", img: "img/bebidas/limonadas/Coco.webp" }),
            reg({ n: "04", name: "LIMON CEREZA", price: "$12.000", img: "img/bebidas/limonadas/Cereza.webp" }),
            reg({
              n: "05",
              name: "LIMONADA DE MANGO BICHE",
              tag: "ESCARCHADO CON TAJÍN O SAL",
              price: "$10.000",
              img: "img/bebidas/limonadas/MangoBiche.webp"
            }),
            reg({ n: "06", name: "LIMONADA DE HIERBABUENA", price: "$8.000", img: "" }),
            reg({ n: "07", name: "LIMONADA DE PANELA PERSONAL", price: "$7.000", img: "" }),
            reg({ n: "08", name: "LIMONADA NATURAL PERSONAL", price: "$7.000", img: "" }),
            reg({
              n: "09",
              name: "LIMONADA PANELA 1.5L",
              warningTag: "SOLO PARA CONSUMO EN EL RESTAURANTE",
              price: "$14.000",
              img: ""
            }),
            reg({
              n: "10",
              name: "LIMONADA NATURAL 1.5L",
              warningTag: "SOLO PARA CONSUMO EN EL RESTAURANTE",
              price: "$14.000",
              img: ""
            })
          ]
        },
        {
          title: "JUGOS",
          items: [
            reg({ n: "11", name: "FRESA + MANGO PERSONAL", price: "$9.000", img: "" }),
            reg({ n: "12", name: "MARACUYÁ + MANGO PERSONAL", price: "$9.000", img: "" }),
            reg({ n: "13", name: "MANDARINA + NARANJA", price: "$9.000", img: "" }),
            reg({ n: "14", name: "NARANJA + PIÑA PERSONAL", price: "$9.000", img: "img/bebidas/jugos/NaranjaPina.webp" }),
            reg({ n: "15", name: "FRESA + MANGO 1.5L", price: "$17.000", img: "" }),
            reg({ n: "16", name: "MARACUYÁ + MANGO 1.5L", price: "$17.000", img: "" }),
            reg({ n: "17", name: "MANDARINA + NARANJA 1.5L", price: "$17.000", img: "" }),
            reg({ n: "18", name: "NARANJA + PIÑA 1.5L", price: "$17.000", img: "img/bebidas/jugos/NaranjaPina.webp" })
          ]
        },
        {
          title: "CERVEZAS",
          subsections: [
            {
              title: "IMPORTADAS",
              items: [
                reg({ n: "19", name: "ESTRELLA GALICIA", price: "$14.000", img: "" }),
                reg({ n: "20", name: "DUFF", price: "$13.000", img: "" }),
                reg({ n: "21", name: "CORONA", price: "$10.000", img: "" }),
                reg({ n: "22", name: "STELLA ARTOIS", price: "$10.000", img: "" }),
                reg({ n: "23", name: "HEINEKEN", price: "$7.000", img: "" })
              ]
            },
            {
              title: "ARTESANALES",
              items: [
                reg({ n: "24", name: "3 CORDILLERAS ROSADA", price: "$9.000", img: "" }),
                reg({ n: "25", name: "3 CORDILLERAS NEGRA", price: "$9.000", img: "" })
              ]
            },
            {
              title: "NACIONALES",
              items: [
                reg({ n: "26", name: "CLUB COLOMBIA DORADA", price: "$7.000", img: "" }),
                reg({ n: "27", name: "CLUB COLOMBIA ROJA", price: "$7.000", img: "" }),
                reg({ n: "28", name: "CLUB COLOMBIA DE TRIGO", price: "$7.000", img: "" }),
                reg({
                  n: "29",
                  name: "JARRA LITRO DE CLUB COLOMBIA DORADA",
                  tag: "PÍDELA SOLA O EN MICHELADA",
                  price: "$15.000",
                  img: ""
                })
              ]
            }
          ]
        },
        {
          title: "OTRAS BEBIDAS",
          items: [
            reg({
              n: "30",
              name: "GASEOSA POSTOBÓN PET 400",
              price: "$5.000",
              desc: "Manzana Postobón o Kola Hipinto",
              img: ""
            }),
            reg({ n: "31", name: "AGUA MINERAL HATSU 600ML", price: "$5.000", img: "" }),
            reg({ n: "32", name: "TÉ HATSU", price: "$8.000", img: "" }),
            reg({ n: "33", name: "SODA BRETAÑA", price: "$5.000", img: "" })
          ]
        }
      ]
    },

    Postres: {
      label: "POSTRES",
      type: "cards",
      photo: [
        reg({
          n: "01",
          name: "BROWNIE CON HELADO",
          price: "$16.000",
          img: "",
          desc: "Brownie de chocolate con helado de vainilla en tierra de galleta y salsa de chocolate semi amargo."
        })
      ]
    }
  };

  /* ---------- DOM ---------- */
  const panelEl = document.getElementById("panel");
  const modal = document.getElementById("modal");
  const modalBox = document.getElementById("modalBox");
  const tabsEl = document.getElementById("tabs");
  const loaderEl = document.getElementById("loader");
  const mnav = document.getElementById("mnav");
  const burgerBtn = document.getElementById("burger");
  const mnavClose = document.getElementById("mnavClose");
  const orderFab = document.getElementById("orderFab");
  const orderFabCount = document.getElementById("orderFabCount");

  let current = "burgers";
  let orderState = { items: [] };
  let draftConfig = null;
  let lastFocus = null;

  const loadOrder = () => {
    try {
      const raw = sessionStorage.getItem(ORDER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.items)) orderState.items = parsed.items;
    } catch {
      /* ignore */
    }
  };

  const saveOrder = () => {
    try {
      sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orderState));
    } catch {
      /* ignore */
    }
  };

  const orderCount = () => orderState.items.reduce((sum, it) => sum + (it.qty || 1), 0);

  const orderTotal = () =>
    orderState.items.reduce((sum, it) => sum + (it.unitPriceValue || 0) * (it.qty || 1), 0);

  const updateFab = () => {
    const n = orderCount();
    if (!orderFab) return;
    orderFabCount.textContent = String(n);
    orderFab.classList.toggle("visible", n > 0);
    orderFab.setAttribute("aria-label", n ? `Ver tu pedido (${n})` : "Ver tu pedido");
  };

  const mediaHTML = (src, alt, className = "") => {
    if (src) {
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" class="${className}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'img-ph',textContent:'BURGOS'}))">`;
    }
    return `<div class="img-ph" aria-hidden="true">BURGOS</div>`;
  };

  const actionsHTML = (it) => `
    <div class="card-actions-right">
      <button type="button" class="details-link" data-action="detail" data-i="${idxOf(it)}">VER DETALLE</button>
      <button type="button" class="order-link disp text-sm tracking-widest" data-action="order" data-i="${idxOf(it)}">PEDIR POR WHATSAPP</button>
    </div>`;

  const needsConfig = (it) =>
    Boolean((it.sizes && it.sizes.length) || (it.choices && it.choices.length) || (it.addons && it.addons.length));

  function cardHTML(it, showDalePoder) {
    const i = idxOf(it);
    return `<div class="bcard" data-anim data-action="detail" data-i="${i}" role="button" tabindex="0">
      <span class="num">${escapeHtml(it.n)}</span>
      ${it.warningTag ? `<span class="tag tag-warning">${escapeHtml(it.warningTag)}</span>` : ""}
      ${it.tag ? `<span class="tag">${escapeHtml(it.tag)}</span>` : ""}
      <div class="ph">${mediaHTML(it.img, it.name)}</div>
      <div class="ticket"></div>
      <div class="p-5">
        <h3 class="disp text-3xl leading-none" style="color:var(--crema)">${escapeHtml(it.name)}</h3>
        <p class="text-[13px] mt-2 leading-snug" style="color:var(--crema-fade)">${it.desc || ""}</p>
        ${showDalePoder ? `<div class="dale-poder-note" data-card-note role="note">
          <span class="dale-poder-title">${escapeHtml(DALE_PODER.label)} <strong>+${escapeHtml(DALE_PODER.price)}</strong></span>
          <span>${escapeHtml(DALE_PODER.description)}</span>
          <span>Pídelo al ordenar.</span>
        </div>` : ""}
        <div class="card-actions mt-4">
          <span class="disp text-2xl" style="color:var(--ambar)">${escapeHtml(it.price)}</span>
          ${actionsHTML(it)}
        </div>
      </div>
    </div>`;
  }

  function extraRowHTML(it) {
    const i = idxOf(it);
    const hasDetail = Boolean(it.desc);
    return `<div class="mini-extra-row" data-anim>
      <div class="mini-extra-main">
        <span class="mini-extra-num">${escapeHtml(it.n)}</span>
        <div class="mini-extra-copy">
          <span class="mini-extra-name">${escapeHtml(it.name)}</span>
          ${it.desc ? `<span class="mini-extra-desc">${escapeHtml(it.desc)}</span>` : ""}
        </div>
      </div>
      <div class="mini-extra-meta">
        <span class="mini-extra-price">${escapeHtml(it.price)}</span>
        ${hasDetail ? `<button type="button" class="details-link" data-action="detail" data-i="${i}">VER DETALLE</button>` : ""}
        <button type="button" class="order-link disp text-sm tracking-widest" data-action="order" data-i="${i}">PEDIR POR WHATSAPP</button>
      </div>
    </div>`;
  }

  function beverageItemHTML(it) {
    const i = idxOf(it);
    return `<div class="beverage-card" data-anim data-action="detail" data-i="${i}" role="button" tabindex="0">
      <div class="beverage-img">${mediaHTML(it.img, it.name)}</div>
      <div class="beverage-info">
        <div class="beverage-name">${escapeHtml(it.name)}</div>
        ${it.desc ? `<div class="beverage-desc">${escapeHtml(it.desc)}</div>` : ""}
        ${it.warningTag ? `<div class="allergy" style="margin-top:6px">${escapeHtml(it.warningTag)}</div>` : ""}
        <div class="beverage-price">${escapeHtml(it.price)}</div>
        <button type="button" class="order-link disp text-sm tracking-widest" data-action="order" data-i="${i}">PEDIR POR WHATSAPP</button>
      </div>
    </div>`;
  }

  function beveragesHTML(d) {
    return `<div class="beverages-container">
      ${d.groups
        .map(
          (group) => `<section class="beverage-group">
          <div class="beverage-title"><span>${escapeHtml(group.title)}</span><span class="beverage-line"></span></div>
          ${
            group.subsections
              ? group.subsections
                  .map(
                    (sub) => `<div class="beverage-subsection">
                <h3>${escapeHtml(sub.title)}</h3>
                <div class="beverage-items">${sub.items.map(beverageItemHTML).join("")}</div>
              </div>`
                  )
                  .join("")
              : `<div class="beverage-items">${group.items.map(beverageItemHTML).join("")}</div>`
          }
        </section>`
        )
        .join("")}
    </div>`;
  }

  function render(key) {
    const d = MENU[key];
    if (!d) return;
    let h = "";

    if (d.type === "cards") {
      h += `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">${d.photo.map((item) => cardHTML(item, d.showDalePoder)).join("")}</div>`;
    } else if (d.type === "beverages") {
      h += beveragesHTML(d);
    } else if (d.type === "list2col") {
      h += `<div class="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
        ${d.cols.map((col) => `<div class="mini-extra-column">${col.map(extraRowHTML).join("")}</div>`).join("")}
      </div>`;
    }

    panelEl.innerHTML = h;
    const els = panelEl.querySelectorAll("[data-anim]");
    els.forEach((e, i) => {
      e.classList.remove("in");
      e.style.transitionDelay = Math.min(i * 70, 560) + "ms";
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => els.forEach((e) => e.classList.add("in")))
    );
  }

  function buildTabs() {
    tabsEl.innerHTML = Object.keys(MENU)
      .map(
        (k) =>
          `<button type="button" class="tab ${k === current ? "on" : ""}" role="tab" aria-selected="${k === current}" data-k="${k}">${MENU[k].label}</button>`
      )
      .join("");
  }

  const getSectionItems = (section) => {
    if (section.type === "cards") return section.photo || [];
    if (section.type === "beverages") {
      const items = [];
      (section.groups || []).forEach((group) => {
        if (group.subsections) group.subsections.forEach((sub) => items.push(...(sub.items || [])));
        else items.push(...(group.items || []));
      });
      return items;
    }
    if (section.type === "list2col") return (section.cols || []).flat();
    return [];
  };

  /* ---------- ORDER LINE BUILDERS ---------- */
  const defaultDraft = (it) => {
    const size = it.sizes?.[0] || null;
    const choices = {};
    (it.choices || []).forEach((c) => {
      choices[c.id] = c.values[0] || "";
    });
    return {
      itemIndex: idxOf(it),
      sizeId: size?.id || null,
      choices,
      addonIds: []
    };
  };

  const resolveUnit = (it, draft) => {
    let unitPriceValue = it.priceValue;
    let unitPrice = it.price;
    let sizeLabel = "";
    if (it.sizes?.length) {
      const size = it.sizes.find((s) => s.id === draft.sizeId) || it.sizes[0];
      unitPriceValue = size.priceValue;
      unitPrice = size.price;
      sizeLabel = size.label;
    }
    const addons = (it.addons || []).filter((a) => draft.addonIds.includes(a.id));
    addons.forEach((a) => {
      unitPriceValue += a.priceValue;
    });
    const choiceParts = (it.choices || [])
      .map((c) => (draft.choices[c.id] ? `${c.label}: ${draft.choices[c.id]}` : ""))
      .filter(Boolean);
    return {
      unitPriceValue,
      unitPrice: formatPrice(unitPriceValue) || unitPrice,
      sizeLabel,
      addons,
      choiceParts
    };
  };

  const lineFromDraft = (it, draft, qty = 1) => {
    const resolved = resolveUnit(it, draft);
    return {
      uid: uid(),
      name: it.name,
      qty,
      unitPrice: resolved.unitPrice,
      unitPriceValue: resolved.unitPriceValue,
      sizeLabel: resolved.sizeLabel,
      choices: { ...draft.choices },
      choiceParts: resolved.choiceParts,
      addons: resolved.addons.map((a) => a.label),
      warningTag: it.warningTag || ""
    };
  };

  const lineSignature = (line) =>
    JSON.stringify({
      name: line.name,
      sizeLabel: line.sizeLabel || "",
      choices: line.choices || {},
      addons: [...(line.addons || [])].sort(),
      unitPriceValue: line.unitPriceValue
    });

  const addOrMergeLine = (line) => {
    const sig = lineSignature(line);
    const existing = orderState.items.find((x) => lineSignature(x) === sig);
    if (existing) {
      existing.qty += line.qty || 1;
    } else {
      orderState.items.push(line);
    }
  };

  const lineLabel = (line) => {
    const bits = [line.name];
    if (line.sizeLabel && line.sizeLabel !== "Simple") bits.push(line.sizeLabel);
    if (line.choiceParts?.length) bits.push(line.choiceParts.join(", "));
    if (line.addons?.length) bits.push(line.addons.join(", "));
    return bits.join(" · ");
  };

  const buildWhatsAppMessage = (items) => {
    const lines = items.map((line, idx) => {
      const detail = lineLabel(line);
      return `${idx + 1}. ${detail} ×${line.qty} — ${formatPrice(line.unitPriceValue * line.qty)}`;
    });
    const total = items.reduce((s, l) => s + l.unitPriceValue * l.qty, 0);
    return `${greeting()}, me gustaría hacer este pedido:\n${lines.join("\n")}\n\nTotal estimado: ${formatPrice(total)}`;
  };

  /* ---------- MODAL ---------- */
  const setModalWide = (wide) => modal.classList.toggle("wide", Boolean(wide));

  const openModalShell = () => {
    lastFocus = document.activeElement;
    document.body.classList.add("modal-active");
    modal.classList.add("on");
    document.body.style.overflow = "hidden";
    modal.scrollTop = 0;
    modalBox.scrollTop = 0;
    const closeBtn = modalBox.querySelector(".x");
    if (closeBtn) closeBtn.focus();
  };

  function cerrarModal() {
    modal.classList.remove("on");
    modal.classList.remove("wide");
    document.body.classList.remove("modal-active");
    document.body.style.overflow = "";
    draftConfig = null;
    if (lastFocus && typeof lastFocus.focus === "function") {
      try {
        lastFocus.focus();
      } catch {
        /* ignore */
      }
    }
  }

  function optionsFormHTML(it, draft) {
    let html = "";
    if (it.sizes?.length) {
      html += `<div class="option-group">
        <div class="option-group-label">Presentación</div>
        <div class="option-chips" role="group" aria-label="Presentación">
          ${it.sizes
            .map(
              (s) => `<button type="button" class="option-chip ${draft.sizeId === s.id ? "on" : ""}" data-action="size" data-id="${escapeHtml(s.id)}">
              ${escapeHtml(s.label)}<small>${escapeHtml(s.price)}</small>
            </button>`
            )
            .join("")}
        </div>
      </div>`;
    }
    (it.choices || []).forEach((c) => {
      html += `<div class="option-group">
        <div class="option-group-label">${escapeHtml(c.label)}${c.required ? " *" : ""}</div>
        <div class="option-chips" role="group" aria-label="${escapeHtml(c.label)}">
          ${c.values
            .map(
              (v) => `<button type="button" class="option-chip ${draft.choices[c.id] === v ? "on" : ""}" data-action="choice" data-cid="${escapeHtml(c.id)}" data-val="${escapeAttr(v)}">${escapeHtml(v)}</button>`
            )
            .join("")}
        </div>
      </div>`;
    });
    if (it.addons?.length) {
      html += `<div class="option-group">
        <div class="option-group-label">Extras</div>
        <div class="option-chips" role="group" aria-label="Extras">
          ${it.addons
            .map((a) => {
              const on = draft.addonIds.includes(a.id);
              return `<button type="button" class="option-chip ${on ? "on" : ""}" data-action="addon" data-id="${escapeHtml(a.id)}">
                ${escapeHtml(a.label)}<small>+${escapeHtml(a.price)}</small>
              </button>`;
            })
            .join("")}
        </div>
      </div>`;
    }
    return html;
  }

  function renderProductModal(i) {
    const it = ALL[i];
    if (!it) return;
    if (!draftConfig || draftConfig.itemIndex !== i) draftConfig = defaultDraft(it);
    const resolved = resolveUnit(it, draftConfig);
    setModalWide(false);
    modalBox.innerHTML = `
      <button class="x" data-action="close" aria-label="Cerrar">✕</button>
      ${it.img ? `<div class="aspect-square overflow-hidden">${mediaHTML(it.img, it.name, "w-full h-full object-cover")}<div class="ticket"></div></div>` : ""}
      <div class="p-7 text-center">
        ${it.warningTag ? `<div class="allergy-banner" role="alert">⚠ ${escapeHtml(it.warningTag)}</div>` : ""}
        ${it.tag ? `<span class="tag inline-block mb-3" style="position:static">${escapeHtml(it.tag)}</span>` : ""}
        <h3 id="modalTitle" class="disp text-4xl md:text-5xl leading-none" style="color:var(--crema)">${escapeHtml(it.name)}</h3>
        <p class="mt-3 leading-relaxed" style="color:var(--crema-dim)">${it.desc || ""}</p>
        <div class="disp text-4xl mt-5" style="color:var(--ambar)">${escapeHtml(resolved.unitPrice)}</div>
        ${optionsFormHTML(it, draftConfig)}
        <div class="mt-6 text-[10px] uppercase tracking-[.22em]" style="color:var(--crema-fade)">¿QUÉ DESEAS HACER?</div>
        <div class="modal-actions mt-3">
          <button type="button" class="ghost disp text-sm px-5 py-3 tracking-widest" data-action="add-continue" data-i="${i}">AGREGAR Y SEGUIR</button>
          <button type="button" class="sticker disp text-sm px-5 py-3 tracking-widest" data-action="add-order" data-i="${i}">AGREGAR AL PEDIDO</button>
        </div>
      </div>`;
    openModalShell();
  }

  function abrirModal(i) {
    renderProductModal(i);
  }

  function openOrderFlow(i) {
    const it = ALL[i];
    if (!it) return;
    if (needsConfig(it)) {
      renderProductModal(i);
      return;
    }
    addOrMergeLine(lineFromDraft(it, defaultDraft(it)));
    saveOrder();
    updateFab();
    renderOrderModal();
  }

  function commitDraft(i, thenOrder) {
    const it = ALL[i];
    if (!it || !draftConfig) return;
    for (const c of it.choices || []) {
      if (c.required && !draftConfig.choices[c.id]) return;
    }
    addOrMergeLine(lineFromDraft(it, draftConfig));
    saveOrder();
    updateFab();
    draftConfig = null;
    if (thenOrder) renderOrderModal();
    else cerrarModal();
  }

  function renderOrderModal() {
    setModalWide(true);
    const selected = orderState.items;

    const availableByCategory = Object.keys(MENU)
      .map((key) => {
        const section = MENU[key];
        const visible = getSectionItems(section);
        if (!visible.length) return "";
        return `<div class="order-category-block">
          <div class="order-category-title">${escapeHtml(MENU[key].label)}</div>
          <div class="order-category-items">
            ${visible
              .map(
                (item) =>
                  `<button type="button" class="mini-add" data-action="quick-add" data-i="${idxOf(item)}">${escapeHtml(item.name)}</button>`
              )
              .join("")}
          </div>
        </div>`;
      })
      .join("");

    const listHTML = selected.length
      ? selected
          .map(
            (line) => `<div class="order-item-row">
          <div class="order-item-main">
            <span class="order-item-name">${escapeHtml(lineLabel(line))}</span>
            ${line.warningTag ? `<span class="allergy" style="align-self:flex-start">${escapeHtml(line.warningTag)}</span>` : ""}
            <span class="order-item-price">${escapeHtml(formatPrice(line.unitPriceValue * line.qty))}</span>
          </div>
          <div class="order-item-controls">
            <button type="button" class="qty-btn" data-action="qty" data-uid="${escapeHtml(line.uid)}" data-delta="-1" aria-label="Quitar uno">−</button>
            <span class="qty-val">${line.qty}</span>
            <button type="button" class="qty-btn" data-action="qty" data-uid="${escapeHtml(line.uid)}" data-delta="1" aria-label="Agregar uno">+</button>
            <button type="button" class="mini-remove" data-action="remove" data-uid="${escapeHtml(line.uid)}">Quitar</button>
          </div>
        </div>`
          )
          .join("")
      : '<p class="text-sm" style="color:var(--crema-dim)">Aún no tienes productos en tu pedido.</p>';

    const countText = selected.length
      ? `${orderCount()} ${orderCount() === 1 ? "producto" : "productos"}`
      : "pedido vacío";

    modalBox.innerHTML = `
      <button class="x" data-action="close" aria-label="Cerrar">✕</button>
      <div class="order-window p-5 md:p-6">
        <div class="order-panel">
          <div class="order-summary-badge">${escapeHtml(countText)}</div>
          <span class="tag inline-block mb-3" style="position:static">TU PEDIDO</span>
          <h3 id="modalTitle" class="disp text-4xl md:text-5xl leading-none" style="color:var(--crema)">¿Qué más quieres?</h3>
          <div class="order-hint">Puedes agregar más elementos antes de enviar tu pedido.</div>
          <div class="mt-4 space-y-3">${listHTML}</div>
          ${
            selected.length
              ? `<div class="order-total-row"><span>TOTAL ESTIMADO</span><span>${escapeHtml(formatPrice(orderTotal()))}</span></div>`
              : ""
          }
          <div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" class="ghost disp text-sm px-5 py-3 tracking-widest" data-action="keep-exploring">SEGUIR EXPLORANDO</button>
            <button type="button" class="sticker disp text-sm px-5 py-3 tracking-widest" data-action="confirm-wa" ${selected.length ? "" : "disabled"}>CONFIRMAR POR WHATSAPP</button>
          </div>
        </div>
        <div class="order-catalog">
          <div class="disp text-xl tracking-widest mb-3" style="color:var(--ambar)">TODO EL MENÚ</div>
          <div class="order-catalog-scroll">${availableByCategory || '<p class="text-sm" style="color:var(--crema-dim)">No hay más productos disponibles para agregar.</p>'}</div>
        </div>
      </div>`;
    openModalShell();
  }

  function changeQty(lineUid, delta) {
    const line = orderState.items.find((x) => x.uid === lineUid);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) {
      orderState.items = orderState.items.filter((x) => x.uid !== lineUid);
    }
    saveOrder();
    updateFab();
    if (!orderState.items.length) {
      cerrarModal();
      return;
    }
    renderOrderModal();
  }

  function removeOrderItem(lineUid) {
    orderState.items = orderState.items.filter((x) => x.uid !== lineUid);
    saveOrder();
    updateFab();
    if (!orderState.items.length) {
      cerrarModal();
      return;
    }
    renderOrderModal();
  }

  function confirmWhatsApp() {
    if (!orderState.items.length) return;
    window.open(whatsappUrl(buildWhatsAppMessage(orderState.items)), "_blank", "noopener,noreferrer");
    orderState.items = [];
    saveOrder();
    updateFab();
    cerrarModal();
  }

  function keepExploring() {
    cerrarModal();
  }

  /* ---------- EVENTS ---------- */
  const handleAction = (el) => {
    const action = el.dataset.action;
    if (!action) return false;

    if (action === "close") {
      cerrarModal();
      return true;
    }
    if (action === "detail") {
      abrirModal(Number(el.dataset.i));
      return true;
    }
    if (action === "order") {
      openOrderFlow(Number(el.dataset.i));
      return true;
    }
    if (action === "add-continue") {
      commitDraft(Number(el.dataset.i), false);
      return true;
    }
    if (action === "add-order") {
      commitDraft(Number(el.dataset.i), true);
      return true;
    }
    if (action === "size" && draftConfig) {
      draftConfig.sizeId = el.dataset.id;
      renderProductModal(draftConfig.itemIndex);
      return true;
    }
    if (action === "choice" && draftConfig) {
      draftConfig.choices[el.dataset.cid] = el.dataset.val;
      renderProductModal(draftConfig.itemIndex);
      return true;
    }
    if (action === "addon" && draftConfig) {
      const id = el.dataset.id;
      if (draftConfig.addonIds.includes(id)) {
        draftConfig.addonIds = draftConfig.addonIds.filter((x) => x !== id);
      } else {
        draftConfig.addonIds.push(id);
      }
      renderProductModal(draftConfig.itemIndex);
      return true;
    }
    if (action === "keep-exploring") {
      keepExploring();
      return true;
    }
    if (action === "confirm-wa") {
      confirmWhatsApp();
      return true;
    }
    if (action === "qty") {
      changeQty(el.dataset.uid, Number(el.dataset.delta));
      return true;
    }
    if (action === "remove") {
      removeOrderItem(el.dataset.uid);
      return true;
    }
    if (action === "quick-add") {
      openOrderFlow(Number(el.dataset.i));
      return true;
    }
    return false;
  };

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-card-note]")) return;
    const el = e.target.closest("[data-action]");
    if (!el) return;
    if (el.closest(".bcard") && el.dataset.action === "detail" && e.target.closest("button")) {
      /* button inside card handled normally */
    }
    if (handleAction(el)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("on")) {
      cerrarModal();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      const el = e.target.closest("[data-action]");
      if (el && (el.matches(".bcard") || el.matches(".beverage-card"))) {
        e.preventDefault();
        handleAction(el);
      }
    }
  });

  const scrollToMenuCategory = () => {
    const target = document.getElementById("tabs") || document.getElementById("carta");
    if (!target) return;
    const headerOffset = 72;
    const y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  tabsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (!b || b.dataset.k === current) return;
    current = b.dataset.k;
    tabsEl.querySelectorAll(".tab").forEach((x) => {
      const on = x === b;
      x.classList.toggle("on", on);
      x.setAttribute("aria-selected", on ? "true" : "false");
    });
    panelEl.style.opacity = 0;
    setTimeout(() => {
      render(current);
      panelEl.style.opacity = 1;
      scrollToMenuCategory();
    }, 220);
  });

  if (orderFab) {
    orderFab.addEventListener("click", () => {
      if (orderState.items.length) renderOrderModal();
    });
  }

  function openM() {
    mnav.classList.remove("closed");
    mnav.classList.add("open");
    document.body.style.overflow = "hidden";
    burgerBtn.setAttribute("aria-expanded", "true");
  }
  function closeM() {
    mnav.classList.add("closed");
    mnav.classList.remove("open");
    document.body.style.overflow = "";
    burgerBtn.setAttribute("aria-expanded", "false");
  }
  burgerBtn.setAttribute("aria-expanded", "false");
  burgerBtn.setAttribute("aria-controls", "mnav");
  burgerBtn.addEventListener("click", openM);
  mnavClose.addEventListener("click", closeM);
  document.querySelectorAll(".nav-m").forEach((a) => a.addEventListener("click", closeM));

  /* ---------- MARQUEE ---------- */
  (function () {
    const words = [
      "HECHO AL CARBÓN",
      "BURGER MASTER 2025 & 2026",
      "GIRÓN · SANTANDER",
      "SABOR QUE NO SE OLVIDA",
      "LA MEJOR EXPERIENCIA PARA TU PALADAR",
      "SOBREMESA LARGA"
    ];
    const build = () =>
      words
        .map((w, i) =>
          `<span class="px-7" style="color:var(--crema)">${w} <span style="color:var(--${i % 2 ? "azul" : "rojo"})">★</span></span>`
        )
        .join("");
    document.getElementById("marquee").innerHTML = build() + build();
  })();

  /* ---------- HOURS + WA LINKS ---------- */
  const syncHours = () => {
    const open = isOpenNow();
    const status = document.getElementById("hoursStatus");
    const label = document.getElementById("hoursLabel");
    if (label) label.textContent = BUSINESS.hoursLabel;
    if (status) {
      status.classList.toggle("open", open);
      status.classList.toggle("closed", !open);
      status.innerHTML = `<i></i><span>${open ? "ABIERTO AHORA" : "CERRADO AHORA"}</span>`;
    }
  };

  const syncWaLinks = () => {
    const url = helloWhatsAppUrl();
    ["heroWa", "contactWa"].forEach((id) => {
      const a = document.getElementById(id);
      if (a) a.href = url;
    });
    const birthdayWa = document.getElementById("birthdayWa");
    if (birthdayWa) {
      birthdayWa.href = whatsappUrl(`${greeting()}, quiero reservar una mesa para celebrar un cumpleaños. ¿Me comparten la disponibilidad?`);
    }
    const birthdayCall = document.getElementById("birthdayCall");
    if (birthdayCall) birthdayCall.href = `tel:+${WHATSAPP_NUMBER}`;
  };

  /* ---------- MAP LAZY ---------- */
  const mapFrame = document.getElementById("mapFrame");
  if (mapFrame) {
    const loadMap = () => {
      if (mapFrame.dataset.loaded) return;
      const src = mapFrame.dataset.mapSrc;
      if (!src) return;
      mapFrame.dataset.loaded = "1";
      mapFrame.classList.remove("is-pending");
      mapFrame.innerHTML = `<iframe src="${src}" title="Ubicación de Burgos Gastro House en Google Maps" width="600" height="450" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    };
    const mapIo = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMap();
          mapIo.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    mapIo.observe(mapFrame);
  }

  /* ---------- REVEAL + SCROLLSPY ---------- */
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      }),
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

  const spy = new IntersectionObserver(
    (es) =>
      es.forEach((en) => {
        if (en.isIntersecting) {
          const id = en.target.id;
          document.querySelectorAll(".navlink").forEach((l) => l.classList.toggle("on", l.dataset.sec === id));
        }
      }),
    { rootMargin: "-45% 0px -50% 0px" }
  );
  ["carta", "contacto", "casa"].forEach((id) => {
    const s = document.getElementById(id);
    if (s) spy.observe(s);
  });

  /* ---------- EXPOSE (compat) ---------- */
  window.cerrarModal = cerrarModal;
  window.abrirModal = abrirModal;
  window.openOrderFlow = (nameOrIndex) => {
    if (typeof nameOrIndex === "number") return openOrderFlow(nameOrIndex);
    const i = ALL.findIndex((x) => x.name.toLowerCase() === String(nameOrIndex).toLowerCase());
    if (i >= 0) openOrderFlow(i);
  };

  /* ---------- INIT ---------- */
  loadOrder();
  updateFab();
  syncHours();
  syncWaLinks();
  buildTabs();
  window.addEventListener("load", () => {
    setTimeout(() => {
      loaderEl.classList.add("hide");
      render(current);
    }, 900);
  });
})();
