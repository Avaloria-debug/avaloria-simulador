# Revisión sugerida de candidatos (2026-11-21)

Sugerencias de Opus para que Tomás decida. **No se aprobó nada: los 92 candidatos siguen en `pendiente`** en `charla-npc-300-800-textos.jsonl` y `charla-npc-300-800-frases-agrupadas.json`. Los archivos de candidatos no se tocaron.

Criterio: natural, voseo o neutro, sin copia de la descripción del perfil, sin contradecir el mundo (geografía, lo que vende cada NPC, conocimientos de otro NPC) y sin salidas rotas. Un texto que solo vale con un evento, una hora o un objeto del caso se sugiere rechazar, porque el candidato no lleva esa condición. A = aprobar, E = editar (con el texto corregido), R = rechazar.

| | A | E | R | Total |
|---|---|---|---|---|
| Textos del narrador | 22 | 13 | 25 | 60 |
| Frases del jugador IA | 13 | 12 | 7 | 32 |
| **Total** | **35** | **25** | **32** | **92** |

Las frases del jugador se agrupan por la intención que entendió el motor (todas venían sin intención objetivo).

## intencion_ayudar (1: A 1 · E 0 · R 0)

| Id | Clase | Sug. | Original | Texto corregido | Motivo | Contexto |
|---|---|---|---|---|---|---|
| c0029 | frase | A | Voy al Camino del sur a buscar a Hollis Dren y ver en qué lo puedo ayudar. |  | Natural. | voseo_dialogo · perfil amable · motor: npc_ausente |

## intencion_comprar (8: A 3 · E 3 · R 2)

| Id | Clase | Sug. | Original | Texto corregido | Motivo | Contexto |
|---|---|---|---|---|---|---|
| c0001 | frase | R | Acercome a Serel Norlen, le saludo con una sonrisa y le digo: «Che, vi que tenés la espada rota. ¿Te doy una mano a repararla mientras te compro un pan fresco y un poco de queso?». |  | Poco natural ("Acercome"), muy largo e inventa una espada rota de Serel. | voseo_dialogo · perfil amable · motor: objeto_ambiguo |
| c0002 | frase | R | Che, ¿querés que vaya a la molinería a confirmar el pedido y dejar el pago? |  | Revisión de control: nombra una molinería que no existe en el mundo y un pedido que depende del caso. | voseo_dialogo · perfil amable · motor: falta_objeto |
| c0004 | frase | A | Me compro el pan fresco y el queso curado. |  | Natural ("me compro" es habitual). | primera_persona_accion · perfil directo · motor: objeto_ambiguo |
| c0005 | frase | A | Me llevo un pan fresco y un trozo de queso curado, por favor. |  | Natural. | primera_persona_accion · perfil amable · motor: objeto_ambiguo |
| t00005 | texto | E | ¿Qué te llevo, pan recién horneado o algo más? | ¿Qué te llevás, pan recién horneado o algo más? | "¿Qué te llevo?" lo dice el que compra, no el que vende. | reaccion · serel_panadero · jugador: «adquirir» |
| t00006 | texto | E | ¿Qué querés comprar, forastero? Tengo panes recién horneados y algunas galletas de miel. | ¿Qué querés comprar, forastero? Tengo panes recién horneados. | Las galletas de miel no están en lo que vende Serel. | reaccion · serel_panadero · jugador: «comprar algo» |
| t00007 | texto | A | ¿Querés cambiar las monedas por un pan recién salido del horno? Te paso uno al instante. |  | Natural y coherente con el panadero. | reaccion · serel_panadero · jugador: «cambiar monedas por» |
| t00058 | texto | E | ¿Qué necesitás, che? Tenés el pan del día o alguna cosa en especial? Decime y lo tengo listo. | ¿Qué necesitás, che? ¿Querés el pan del día o alguna cosa en especial? Decime y lo tengo listo. | Falta el signo de apertura de pregunta y "Tenés" no encaja. | reaccion · serel_panadero · jugador: «hacer una compra» |

## intencion_hablar_con (14: A 8 · E 3 · R 3)

| Id | Clase | Sug. | Original | Texto corregido | Motivo | Contexto |
|---|---|---|---|---|---|---|
| t00002 | texto | A | ¿Qué te gustaría saber? |  | Natural y neutro; sirve para cualquier NPC. | reaccion · brenn_arriero · jugador: «preguntarle a» |
| t00003 | texto | A | ¿Qué tenés en mente, che? ¿Querés charlar de la ruta o de algo que se cruzó en el camino? |  | Voseo natural, propio de un arriero. | reaccion · brenn_arriero · jugador: «conversar con» |
| t00004 | texto | E | ¿Te quedó alguna duda de la medalla, o seguís el camino? | ¿Te quedó alguna duda, o seguís el camino? | Nombra la medalla, que depende del caso. | reaccion · brenn_arriero · jugador: «charlá con» |
| t00014 | texto | A | Che, ¿qué necesitás saber? No veo nada raro por acá, seguimos la ruta como siempre. |  | Voseo natural; no afirma nada del mundo. | reaccion · brenn_arriero · jugador: «charlá con» |
| t00016 | texto | R | Mirá, la ruta al sur sigue recta hasta el cruce de colinas, después te lleva al Archivo Real y la biblioteca de Halenor. No hay sorpresas, solo el polvo y el viento. |  | Inventa geografía: la ruta al sur no lleva al Archivo Real ni a la biblioteca. | reaccion · brenn_arriero · jugador: «hablame sobre ruta» |
| t00019 | texto | R | ¿Con quién estás hablando, vos? No me suena de nada. |  | No tiene sentido como respuesta: el NPC no sabe con quién habla él mismo. | reaccion · brenn_arriero · jugador: «con quién hablo» |
| t00024 | texto | R | ¿Qué querés? No tengo tiempo para charlas mientras nos asaltan. |  | Depende de un asalto en curso. | reaccion · brenn_arriero · jugador: «hablar con» |
| t00032 | texto | A | Buenas, ¿qué necesitás? |  | Breve y natural. | reaccion · brenn_arriero · jugador: «charlar con» |
| t00039 | texto | A | ¿Qué querés saber, viajero? |  | Natural y neutro. | reaccion · brenn_arriero · jugador: «preguntarle a» |
| t00044 | texto | E | ¿Qué querés, que ya basta de charlas?». | ¿Qué querés? Ya basta de charlas. | Termina con comillas sueltas (salida rota). | reaccion · brenn_arriero · jugador: «dirigirme a Bren Holt» |
| t00046 | texto | A | ¿Qué necesitás, viajero? |  | Natural y neutro. | reaccion · brenn_arriero · jugador: «charlá con» |
| t00047 | texto | A | ¿Qué te trae por aquí en este tramo? |  | Neutro ("por aquí") y natural. | reaccion · brenn_arriero · jugador: «conversar con» |
| t00049 | texto | E | Che, ¿qué necesitás? Vamos, que la noche está tranquila. | Che, ¿qué necesitás? Vamos, que el camino está tranquilo. | "La noche está tranquila" depende de la hora. | reaccion · brenn_arriero · jugador: «hablar con» |
| t00053 | texto | A | No sé dónde está, no la tengo. |  | Natural; no inventa nada. | consulta · brenn_arriero · jugador: «¿Podés decirme dónde está la brújula de viaje?» |

## intencion_retirarse (1: A 1 · E 0 · R 0)

| Id | Clase | Sug. | Original | Texto corregido | Motivo | Contexto |
|---|---|---|---|---|---|---|
| c0020 | frase | A | Che, me voy al Camino del este a buscar a Sarin Tolle. |  | Voseo natural. | primera_persona_accion · perfil amable · motor: destino_ambiguo |

## intencion_viajar (25: A 8 · E 7 · R 10)

| Id | Clase | Sug. | Original | Texto corregido | Motivo | Contexto |
|---|---|---|---|---|---|---|
| c0009 | frase | E | viajar a donde está Sarin Tolle | Voy adonde está Sarin Tolle. | Infinitivo, parece un botón. | no_valida · perfil seguidor_pistas · motor: falta_destino |
| c0010 | frase | E | viajar a Elia Miren | Voy a ver a Elia Miren. | "Viajar a" una persona no suena natural. | no_valida · perfil seguidor_pistas · motor: falta_destino |
| c0014 | frase | E | Viajo hacia Maren de Orst, la saludo y le pregunto en qué puedo ayudarla. | Voy a ver a Maren de Orst, la saludo y le pregunto en qué puedo ayudarla. | "Viajo hacia" una persona no suena natural. | voseo_dialogo · perfil seguidor_pistas · motor: falta_destino |
| c0015 | frase | E | Viajo hacia Sarin Tolle y le pregunto qué necesita. | Voy a ver a Sarin Tolle y le pregunto qué necesita. | "Viajo hacia" una persona no suena natural. | voseo_dialogo · perfil seguidor_pistas · motor: falta_destino |
| c0016 | frase | A | Voy a Brenn Holt y le hablo. |  | Natural y breve. | primera_persona_accion · perfil seguidor_pistas · motor: falta_destino |
| c0017 | frase | E | Voy hacia Maren de Orst y le pregunto qué necesita. | Voy a ver a Maren de Orst y le pregunto qué necesita. | "Voy hacia" una persona no suena natural. | voseo_dialogo · perfil seguidor_pistas · motor: falta_destino |
| c0021 | frase | R | viajar Panadería |  | Salida rota: "viajar Panadería". | no_valida · perfil seguidor_pistas · motor: falta_destino |
| c0023 | frase | E | Viajo al puesto de Serel Norlen y le pregunto qué necesita. | Voy al puesto de Serel Norlen y le pregunto qué necesita. | "Viajo al puesto" no suena natural dentro del mercado. | voseo_dialogo · perfil seguidor_pistas · motor: falta_destino |
| c0024 | frase | E | viajo hacia Serel Norlen para ayudarlo. | Voy a ver a Serel Norlen para darle una mano. | Empieza en minúscula y "viajo hacia" una persona. | primera_persona_accion · perfil seguidor_pistas · motor: falta_destino |
| c0025 | frase | A | Voy a acercarme a Serel Norlen y le pregunto qué necesita. |  | Natural. | voseo_dialogo · perfil seguidor_pistas · motor: falta_destino |
| c0026 | frase | R | Voy a buscar a Serel Norlen y le pregunto qué sabe del dueño. |  | Copia la descripción del perfil ("dueño"). | voseo_dialogo · perfil seguidor_pistas_dueno · motor: falta_destino |
| c0027 | frase | A | Voy a ver a Serel, le ofrezco una mano y le pregunto qué le preocupa. |  | Natural. | voseo_dialogo · perfil seguidor_relacional · motor: falta_destino |
| c0028 | frase | A | Voy a Ysolde Varn y le pregunto qué sabe del mapa de la posada escondida. |  | Natural; pregunta por un objeto del mundo. | voseo_dialogo · perfil seguidor_pistas_dueno · motor: falta_destino |
| c0033 | frase | R | Voy a buscar a Ysolde Varn y le pregunto lo primero que sepa. |  | Copia la descripción del perfil ("lo primero que sepa"). | primera_persona_accion · perfil seguidor_pistas_dueno · motor: falta_destino |
| c0034 | frase | A | Voy a buscar a Ysolde Varn y le pregunto qué sabe del mapa. |  | Natural. | voseo_dialogo · perfil seguidor_pistas_dueno · motor: falta_destino |
| c0035 | frase | R | Voy a Serel Norlen y le pregunto qué sabe del dueño. |  | Copia la descripción del perfil ("dueño"). | voseo_dialogo · perfil seguidor_pistas_dueno · motor: falta_destino |
| t00009 | texto | R | Al Archivo Real, seguí el Camino del norte y no te desvias hasta que veas la gran torre al fondo. |  | Contradice el mundo: el Archivo Real sale directo del mercado, no por el Camino del norte; además dice "desvias" sin tilde. | consulta · serel_panadero · jugador: «adónde voy» |
| t00017 | texto | A | ¿Querés cambiar de rumbo? Decime adónde y vemos. |  | Natural y neutro. | reaccion · brenn_arriero · jugador: «ir a otro lado» |
| t00020 | texto | A | ¿A dónde querés ir? |  | Neutro y breve. | reaccion · serel_panadero · jugador: «ir» |
| t00026 | texto | R | El Archivo Real queda al norte, por la calle principal; seguí recto y lo encontrás. |  | Inventa la ubicación del Archivo ("calle principal"). | reaccion · serel_panadero · jugador: «ir» |
| t00040 | texto | R | No sé qué buscás, pero el Camino del Norte está al final del corredor de los puestos, justo después de la taberna. Andá rápido, que no me gusta quedarme escuchando más peleas. |  | Inventa la ubicación del Camino del norte ("después de la taberna"). | reaccion · serel_panadero · jugador: «llegar a Camino del note» |
| t00054 | texto | R | Necesito que me dejes pasar sin retrasos, el cargamento no espera. No me queda más que seguir el rastro y llegar a la próxima parada. |  | Revisión de control: no responde a lo que dijo el jugador (le pregunta qué necesita) y "seguir el rastro" no encaja con un arriero. | dialogo · brenn_arriero · jugador: «Voy a Brenn Holt y le pregunto qué necesita.» |
| t00056 | texto | A | ¿Querés el pliego? Vení rápido, no tengo tiempo para charlas. |  | Natural. | reaccion · serel_panadero · jugador: «Quiero ir a la panadería a ver el pliego de precios.» |
| t00057 | texto | R | ¿Qué querés, que te deje el pan a mitad de la calle? |  | Revisión de control: no responde a viajar a la panadería; la pregunta no tiene sentido ahí. | reaccion · serel_panadero · jugador: «viajar Panadería» |
| t00060 | texto | R | Mirá, si la medalla tiene dueño, tal vez la encontrás en la biblioteca; el cruce está tenso, pero el camino sigue. |  | Inventa una pista: dice que la medalla está en la biblioteca. | reaccion · brenn_arriero · jugador: «Viajo al poblado más cercano buscando pistas del dueño de la medalla.» |

## (no entendido) (10: A 4 · E 5 · R 1)

| Id | Clase | Sug. | Original | Texto corregido | Motivo | Contexto |
|---|---|---|---|---|---|---|
| c0003 | frase | E | consulto el pliego de precios de la panadería para ver si puedo conseguirle a Serel un mejor trato. | Consulto el pliego de precios de la panadería para ver si puedo conseguirle a Serel un mejor trato. | Empieza en minúscula. | primera_persona_accion · perfil amable · motor: no_entendido |
| c0006 | frase | A | Me quedo cerca por si surge algo y sigo mirando los puestos. |  | Natural. | primera_persona_accion · perfil amable · motor: no_entendido |
| c0007 | frase | A | Serel, pasame el pliego de precios, por favor. |  | Voseo natural. | voseo_dialogo · perfil directo · motor: no_entendido |
| c0008 | frase | A | Tomo el pan fresco y el queso curado, y le paso la plata a Serel. |  | Natural. | primera_persona_accion · perfil directo · motor: no_entendido |
| c0011 | frase | E | Viajo a Ysolde Varn para buscarla y preguntarle. | Voy a buscar a Ysolde Varn para preguntarle. | "Viajo a" una persona no suena natural. | primera_persona_accion · perfil seguidor_pistas · motor: no_entendido |
| c0012 | frase | A | Viajo al puesto de la panadería y compro pan fresco. |  | Natural. | primera_persona_accion · perfil directo · motor: no_entendido |
| c0013 | frase | E | Viajo al puesto de Serel Norlen y le pregunto si necesita ayuda. | Voy al puesto de Serel Norlen y le pregunto si necesita ayuda. | "Viajo al puesto" no suena natural dentro del mercado. | primera_persona_accion · perfil seguidor_pistas · motor: no_entendido |
| c0018 | frase | R | Che, decime al menos una pista que sepas del dueño. |  | Copia la descripción del perfil ("pista", "dueño"). | voseo_dialogo · perfil seguidor_pistas_dueno · motor: no_entendido |
| c0019 | frase | E | Che, me llevás un pan fresco y un poco de queso curado, por favor. | Che, dame un pan fresco y un poco de queso curado, por favor. | "Me llevás" no corresponde: el jugador pide. | voseo_dialogo · perfil amable · motor: no_entendido |
| c0022 | frase | E | viajo a Brenn Holt y lo busco para preguntarle. | Voy a buscar a Brenn Holt para preguntarle. | Empieza en minúscula y "viajo a" una persona. | primera_persona_accion · perfil seguidor_pistas · motor: no_entendido |

## (sin intención) (33: A 11 · E 6 · R 16)

| Id | Clase | Sug. | Original | Texto corregido | Motivo | Contexto |
|---|---|---|---|---|---|---|
| t00001 | texto | R | La consigna está en la caja del carro, bajo la manta azul. Chequeá que todo esté en orden antes de seguir. |  | Ysolde inventa una consigna y un carro que no están en el mundo. | dialogo · ysolde_pescadora · jugador: «Ysolde Varn, consigna» |
| t00008 | texto | A | No sé a qué te referís con “jugar”, pero acá estoy vendiendo pan. Decime qué necesitás. |  | Responde bien a una frase fuera del juego, sin romper el mundo. | reaccion · serel_panadero · jugador: «quiero jugar» |
| t00010 | texto | A | Estás en el Mercado Circular, justo entre los puestos de pan y la gente que va y viene. |  | Describe el mercado tal como lo describe el contenido. | consulta · serel_panadero · jugador: «dónde estoy» |
| t00011 | texto | A | No entiendo, ¿qué querés decir? |  | Neutro y breve. | reaccion · brenn_arriero · jugador: «no entiendo» |
| t00012 | texto | R | Acá solo está el camino, la bruma y la noche sin luna. |  | Depende de un evento (la noche sin luna); fuera de él contradice el mundo. | consulta · brenn_arriero · jugador: «qué hay acá» |
| t00013 | texto | A | ¿Qué querés? No tengo tiempo para tus vueltas. |  | Natural, con tono seco. | reaccion · serel_panadero · jugador: «y ahora qué» |
| t00015 | texto | R | El camino sigue recto hasta la colina, después girás a la derecha y ya ves la entrada al Archivo. |  | Inventa un recorrido hasta el Archivo que no coincide con los caminos. | reaccion · brenn_arriero · jugador: «ruta» |
| t00018 | texto | E | Nada que valga la pena, solo polvo y la sombra de la noche. | Nada que valga la pena, solo polvo y camino. | "La sombra de la noche" depende de la hora. | consulta · brenn_arriero · jugador: «qué hay acá» |
| t00021 | texto | R | Bueno, ahora seguimos hacia el Mercado Circular; si necesitás algo antes, decime. |  | El NPC habla como si viajara con el jugador hacia otra escena. | reaccion · brenn_arriero · jugador: «y ahora qué» |
| t00022 | texto | E | ¿Qué buscás? No tengo tiempo para miradas. | ¿Qué buscás? No tengo todo el día. | Revisión de control: "no tengo tiempo para miradas" no es natural. | reaccion · serel_panadero · jugador: «y ahora qué» |
| t00023 | texto | R | Seguimos, pero cuidate del viento; no quiero que la tormenta nos arrastre a la colina. |  | Depende de la tormenta, un evento que puede no estar activo. | reaccion · brenn_arriero · jugador: «seguir» |
| t00025 | texto | R | ¿Qué hacés con ese mapa ahora, en medio del caos? |  | Depende de un objeto (el mapa) y de un "caos" que puede no estar pasando. | reaccion · brenn_arriero · jugador: «seguir» |
| t00027 | texto | E | ¿Querés una porción de pan o alguna indicación? No sé qué hacer. | ¿Querés una porción de pan o alguna indicación? | El NPC dice "No sé qué hacer", que es una frase del jugador. | reaccion · serel_panadero · jugador: «no sé qué hacer» |
| t00028 | texto | R | Estás en el Mercado Circular, entre los puestos de pan y la gente que va y viene. |  | Casi igual a t00010. | consulta · serel_panadero · jugador: «dónde estoy» |
| t00029 | texto | E | ¿Jugá a qué, visitante? Tengo la masa que amasar y el horno que vigilar, así que ahora mismo no puedo. | ¿Jugar a qué, visitante? Tengo la masa que amasar y el horno que vigilar, así que ahora no puedo. | "¿Jugá a qué" está mal conjugado. | reaccion · serel_panadero · jugador: «quiero jugar» |
| t00030 | texto | A | Che, todo en orden acá. ¿Qué necesitás saber o dónde querés ir? |  | Voseo natural; no afirma nada del mundo. | consulta · maren_archivista · jugador: «qué pasa» |
| t00031 | texto | A | Acá hay pan recién horneado, crocantes y rellenos, y unos quesos del vecino. No hay más. |  | Coherente con el puesto de pan; lo de los quesos del vecino es un detalle menor. | consulta · serel_panadero · jugador: «qué hay acá» |
| t00033 | texto | R | Che, ¿qué necesitás ahora? ¿Querés que te reserve una barra o necesitás información del robo? Decime y vemos. |  | Depende del robo, un evento que puede no estar activo. | reaccion · serel_panadero · jugador: «seguir» |
| t00034 | texto | R | Mirá, lo primero es que la gente siga comprando y no se asuste; después hablá con el guardia del mercado y avisale del robo, y yo me encargo de subir el precio del pan. |  | Depende del robo y le hace prometer a Serel que sube el precio del pan. | consulta · serel_panadero · jugador: «qué tengo que hacer» |
| t00035 | texto | R | Che, la bronca no me interesa, pero si necesitás pan o una carta para el viajero, decime. |  | Depende de eventos (la bronca, la carta del viajero). | reaccion · serel_panadero · jugador: «seguir» |
| t00036 | texto | E | Esto es pan recién horneado, recién salió del horno. | Esto es pan; recién salió del horno. | Repite "recién". | consulta · serel_panadero · jugador: «qué es esto» |
| t00037 | texto | E | Acá vendemos pan recién horneado y unos pasteles de miel, ¿te sirve? | Acá vendemos pan recién horneado. ¿Te sirve? | Los pasteles de miel no están en lo que vende Serel. | consulta · serel_panadero · jugador: «qué hay acá» |
| t00038 | texto | A | ¿Qué no entendés? Decime y lo vemos. |  | Natural. | reaccion · brenn_arriero · jugador: «no entiendo» |
| t00041 | texto | R | Estás en el Mercado Circular de Ardenhall, entre los puestos de pan y la gente que va y viene. |  | Casi igual a t00010. | consulta · serel_panadero · jugador: «dónde estoyy» |
| t00042 | texto | A | ¿Qué necesitás ahora? ¿Comprás algo o querés que te explique los precios? |  | Natural y coherente con el panadero. | reaccion · serel_panadero · jugador: «y ahora qué» |
| t00043 | texto | R | Mirá, eso es el mapa de la posada escondida que tenés en la mano. No sé más, pero sirve para orientarse. |  | Depende de que el jugador tenga el mapa de la posada. | consulta · brenn_arriero · jugador: «qué es esto» |
| t00045 | texto | R | Las colinas están a la vuelta de la curva, pero la patrulla ya anda rondando por ahí, así que cuidate. |  | Depende de la patrulla, un evento. | dialogo · brenn_arriero · jugador: «Brenn Holt, colinas» |
| t00048 | texto | A | Mirá, el pliego está tal cual lo dejé, pero si tenés una propuesta concreta te escucho y vemos si ajustamos algo. |  | Natural y coherente con la panadería. | dialogo · serel_panadero · jugador: «consulto el pliego de precios de la panadería para ver si logro un mejor trato para Serel.» |
| t00050 | texto | R | Che, Hollis, ¿qué necesitás en la posada? |  | Hollis se habla a sí mismo ("Che, Hollis"). | dialogo · hollis_pastor · jugador: «Hollis Dren, posada» |
| t00051 | texto | E | Claro, te echo una mano con lo que necesites, basta que me digas. | Claro, te doy una mano con lo que necesites; decime nomás. | "Basta que me digas" está mal construido y mezcla tuteo. | dialogo · serel_panadero · jugador: «ar una mano Serel Norlen» |
| t00052 | texto | R | Mirá, el sendero anda medio escabroso, con la tierra suelta y unas cuestas que te dejan sin aliento si no cuidás el paso. No hay más que eso por ahora. |  | Brenn habla del sendero, que es un conocimiento de Hollis; contradice el mundo. | dialogo · brenn_arriero · jugador: «Brenn Holt, contame de sendero» |
| t00055 | texto | A | No sé por qué te interesa, pero dejá esas hierbas y seguí tu camino. |  | Natural y coherente con Hollis. | reaccion · hollis_pastor · jugador: «evr de cerca Hierbas medicinales» |
| t00059 | texto | R | ¿Qué necesitás saber de las fogatas, Sarin? |  | Sarin se habla a sí misma ("Sarin"). | dialogo · sarin_mensajera · jugador: «Sarin Tolle, fogatas» |

## Revisión de control (2026-11-21)

Muestra de 10 de los 39 "A" elegidos al azar con seed 2026 (mulberry32, Fisher-Yates sobre el orden del archivo): t00003, t00032, c0027, t00017, t00054, t00057, t00008, t00013, t00022, t00031. Con el mismo criterio se mantienen 7; no pasan t00054, t00057 y t00022.
Como fallaron más de 2, se revisaron otra vez los 39 con el mismo criterio, más estricto con que el texto responda a lo que dijo el jugador y con los lugares que nombra. Cae además c0002 (nombra una molinería que no existe). Quedan 35 "A". Los 4 que salieron de la lista pasan a E o R con el motivo marcado "Revisión de control".
Sigue sin aprobarse nada: los 92 candidatos están en `pendiente` en sus archivos.

## Segunda revisión de control (2026-11-21)

Muestra de 10 de los 35 "A", elegidos al azar con seed 2027 (mismo método: mulberry32 y Fisher-Yates sobre el orden del archivo): c0029, c0005, t00003, t00053, c0020, c0027, c0028, t00020, c0007, t00013. Usé el criterio estricto: natural, voseo o neutro, sin copia del perfil, sin contradecir el mundo, sin salidas rotas y sin nombrar lugares que no existen. Pasan los 10, así que la lista se mantiene en 35 "A".
- Datos que verifiqué en el contenido: Hollis está en el Camino del sur (c0029); Sarin, en el Camino del este (c0020); el pliego de precios es de Serel y aparece en el Mercado Circular (c0007). El "Mapa de la posada escondida" existe como objeto (c0028). El objeto es de Brenn, pero que el jugador se lo pregunte a otro NPC no contradice el mundo.
- Ningún candidato cambió de estado: los 92 siguen en `pendiente`.
