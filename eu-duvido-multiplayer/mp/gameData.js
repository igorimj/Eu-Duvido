/* gameData.js
   Dicionarios, normalizacao e montagem do banco de desafios.
   Reaproveitado da versao single-player do Eu Duvido.
*/
/* ============ UTIL ============ */
function normalize(s){
  return (s||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/-/g,' ')
    .replace(/[^a-z0-9 ]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function fmtTime(sec){
  const m = Math.floor(sec/60), s = sec%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* ============ DICTIONARIES ============ */
const ANIMAIS = "cachorro gato cavalo vaca boi porco ovelha cabra galinha pato ganso peru coelho rato camundongo hamster elefante leao tigre urso lobo raposa macaco gorila chimpanze girafa zebra rinoceronte hipopotamo canguru coala panda jacare crocodilo cobra lagarto tartaruga sapo ra salamandra tubarao baleia golfinho peixe arraia cavalo-marinho aguia coruja pinguim avestruz papagaio arara canario pardal pomba urubu falcao gaviao tucano flamingo cisne morcego ourico esquilo texugo doninha lontra foca leao-marinho morsa orca capivara tatu preguica onca puma chita hiena gnu bufalo alce veado cervo camelo dromedario lhama alpaca bode mula burro minhoca aranha escorpiao polvo lula caramujo caracol ostra mexilhao camarao caranguejo lagosta estrela-do-mar agua-viva coral esponja verme sanguessuga formiga abelha borboleta mosca mosquito barata besouro gafanhoto joaninha libelula lagarta centopeia lacraia piolho pulga cupim vaga-lume bicho-da-seda tatuzinho ourico-do-mar planaria".split(" ");
const INVERTEBRADOS = "minhoca aranha escorpiao polvo lula caramujo caracol ostra mexilhao camarao caranguejo lagosta estrela-do-mar agua-viva coral esponja verme sanguessuga formiga abelha borboleta mosca mosquito barata besouro gafanhoto joaninha libelula lagarta centopeia lacraia piolho pulga cupim vaga-lume bicho-da-seda tatuzinho ourico-do-mar planaria".split(" ");
const COMIDAS = "maca banana laranja uva morango abacaxi manga mamao melancia melao pera pessego ameixa caju goiaba acerola graviola jaca carambola kiwi limao tangerina abacate coco framboesa amora cereja figo roma maracuja pitanga jabuticaba tamarindo damasco nectarina caqui lichia groselha uva-passa batata cenoura cebola alho tomate alface couve repolho brocolis couve-flor abobrinha abobora pepino berinjela pimentao vagem ervilha milho mandioca aipim inhame beterraba rabanete espinafre agriao rucula chuchu quiabo aspargo nabo arroz feijao macarrao lasanha pizza pao queijo presunto salame linguica salsicha bacon frango carne peixe camarao lagosta sushi sashimi feijoada moqueca churrasco coxinha pastel esfirra quibe empada torta bolo biscoito bolacha chocolate sorvete pudim mousse brigadeiro beijinho pacoca pe-de-moleque canjica pipoca farofa tapioca cuscuz omelete panqueca waffle croissant sanduiche hamburguer cachorro-quente lanche salada sopa caldo canja vinagrete maionese ketchup mostarda azeite manteiga margarina leite iogurte requeijao nata creme-de-leite achocolatado cafe cha suco refrigerante agua vinho cerveja licor mel acucar sal pimenta canela cravo oregano manjericao salsinha cebolinha coentro gengibre noz-moscada".split(" ");
const PAISES = "brasil argentina chile uruguai paraguai bolivia peru equador colombia venezuela mexico canada cuba jamaica panama honduras nicaragua guatemala portugal espanha franca italia alemanha inglaterra escocia irlanda holanda belgica suica austria suecia noruega dinamarca finlandia polonia russia ucrania grecia turquia egito marrocos argelia tunisia nigeria gana quenia etiopia china japao india paquistao tailandia vietna indonesia filipinas malasia singapura australia israel libano".split(" ").concat(["africa-do-sul","coreia-do-sul","coreia-do-norte","nova-zelandia","arabia-saudita"]);
const PROFISSOES = "medico enfermeiro dentista advogado juiz promotor professor engenheiro arquiteto programador cientista biologo quimico fisico matematico contador economista administrador jornalista escritor poeta ator atriz cantor musico pintor escultor fotografo cineasta diretor produtor chef cozinheiro padeiro confeiteiro garcom cabeleireiro manicure esteticista farmaceutico veterinario agricultor pescador marinheiro piloto motorista taxista mecanico eletricista encanador pedreiro carpinteiro marceneiro alfaiate costureira sapateiro joalheiro bombeiro policial soldado militar guarda detetive bibliotecario tradutor interprete psicologo psiquiatra fisioterapeuta nutricionista treinador arbitro jogador atleta modelo apresentador locutor".split(" ");
const OBJETOS = "mesa cadeira sofa cama colchao travesseiro cobertor lencol armario espelho quadro tapete cortina abajur lampada ventilador geladeira fogao forno liquidificador batedeira cafeteira torradeira panela frigideira prato copo xicara garfo faca colher tigela chaleira vassoura balde esponja sabao detergente aspirador ferro-de-passar escada martelo alicate parafuso prego tesoura caneta lapis borracha caderno livro computador televisao radio telefone celular carregador relogio calendario chaveiro guarda-chuva mala bolsa mochila".split(" ");
const ESPORTES = "futebol basquete volei handebol tenis natacao atletismo ginastica judo karate taekwondo boxe luta esgrima ciclismo remo canoagem surfe skate patinacao hoquei rugby golfe badminton xadrez halterofilismo triatlo maratona escalada capoeira futsal montanhismo hipismo automobilismo motociclismo".split(" ");
const INSTRUMENTOS = "violao guitarra baixo bateria piano teclado flauta violino viola violoncelo harpa saxofone trompete trombone tuba clarinete oboe acordeon gaita pandeiro tamborim cavaquinho cuica agogo triangulo xilofone orgao contrabaixo bandolim ukulele berimbau chocalho sino tambor".split(" ");
const CORPO = "cabeca cabelo testa olho sobrancelha nariz boca labio dente lingua queixo orelha pescoco ombro braco cotovelo pulso mao dedo unha peito costas barriga umbigo quadril perna coxa joelho canela tornozelo pe calcanhar coracao pulmao figado rim estomago cerebro musculo osso pele veia arteria".split(" ");
const TRANSPORTE = "carro onibus caminhao moto bicicleta trem metro aviao helicoptero navio barco lancha canoa jangada van caminhonete trator patinete teleferico bonde carroca charrete submarino balao jet-ski trailer ambulancia taxi".split(" ");
const ROUPAS = "camisa camiseta blusa calca short bermuda saia vestido jaqueta casaco sueter cardigan moletom pijama roupao meia sapato tenis sandalia chinelo bota salto cinto gravata luva cachecol touca bone chapeu oculos relogio pulseira colar brinco anel sutia cueca calcinha".split(" ");
const CORES = "vermelho azul verde amarelo laranja roxo rosa marrom preto branco cinza bege dourado prateado violeta lilas turquesa ciano magenta bordo vinho salmao creme caramelo oliva jade coral indigo marfim ambar".split(" ");

/* ============ CHALLENGE POOL BUILDER ============ */
const CATS = [
  {label:"animais", prefix:"Cite animais", dict:ANIMAIS},
  {label:"comidas", prefix:"Cite comidas", dict:COMIDAS},
  {label:"países", prefix:"Cite países", dict:PAISES},
  {label:"profissões", prefix:"Cite profissões", dict:PROFISSOES},
  {label:"objetos usados em casa", prefix:"Cite objetos usados em casa", dict:OBJETOS},
  {label:"esportes", prefix:"Cite esportes", dict:ESPORTES},
  {label:"instrumentos musicais", prefix:"Cite instrumentos musicais", dict:INSTRUMENTOS},
  {label:"partes do corpo humano", prefix:"Cite partes do corpo humano", dict:CORPO},
  {label:"meios de transporte", prefix:"Cite meios de transporte", dict:TRANSPORTE},
  {label:"roupas e acessórios", prefix:"Cite roupas e acessórios", dict:ROUPAS},
  {label:"cores", prefix:"Cite cores", dict:CORES},
];
const FIXED_CHALLENGES = [
  {text:"Cite planetas do sistema solar", dict:"mercurio venus terra marte jupiter saturno urano netuno".split(" ")},
  {text:"Cite continentes", dict:"africa america asia europa oceania antartica".split(" ")},
  {text:"Cite oceanos", dict:"atlantico pacifico indico artico antartico glacial-antartico".split(" ")},
  {text:"Cite dias da semana", dict:"domingo segunda segunda-feira terca terca-feira quarta quarta-feira quinta quinta-feira sexta sexta-feira sabado".split(" ")},
  {text:"Cite meses do ano", dict:"janeiro fevereiro marco abril maio junho julho agosto setembro outubro novembro dezembro".split(" ")},
  {text:"Cite estações do ano", dict:"verao outono inverno primavera".split(" ")},
  {text:"Cite sentidos humanos", dict:"visao audicao olfato paladar tato".split(" ")},
  {text:"Cite signos do zodíaco", dict:"aries touro gemeos cancer leao virgem libra escorpiao sagitario capricornio aquario peixes".split(" ")},
  {text:"Cite notas musicais", dict:"do re mi fa sol la si".split(" ")},
  {text:"Cite países que fazem fronteira com o Brasil", dict:"argentina uruguai paraguai bolivia peru colombia venezuela guiana suriname guiana-francesa".split(" ")},
  {text:"Cite cores do arco-íris", dict:"vermelho laranja amarelo verde azul anil violeta".split(" ")},
  {text:"Cite invertebrados", dict:INVERTEBRADOS},
];
const THEMATIC_CHALLENGES = [
  {text:"Cite países que sediaram a Copa do Mundo", dict:"uruguai italia franca brasil suica suecia chile inglaterra mexico alemanha argentina espanha estados-unidos japao coreia-do-sul africa-do-sul russia catar qatar".split(" ")},
  {text:"Cite países do Oriente Médio", dict:"arabia-saudita israel libano siria iraque ira jordania kuwait catar qatar emirados-arabes-unidos oma bahrein iemen turquia chipre palestina".split(" ")},
  {text:"Cite seleções campeãs da Copa do Mundo", dict:"uruguai italia alemanha brasil inglaterra argentina franca espanha".split(" ")},
  {text:"Cite países da América do Sul", dict:"brasil argentina chile uruguai paraguai bolivia peru equador colombia venezuela guiana suriname guiana-francesa".split(" ")},
  {text:"Cite estados brasileiros", dict:"acre alagoas amapa amazonas bahia ceara espirito-santo goias maranhao mato-grosso mato-grosso-do-sul minas-gerais para paraiba parana pernambuco piaui rio-de-janeiro rio-grande-do-norte rio-grande-do-sul rondonia roraima santa-catarina sao-paulo sergipe tocantins distrito-federal".split(" ")},
  {text:"Cite capitais de estados brasileiros", dict:"rio-branco maceio macapa manaus salvador fortaleza vitoria goiania sao-luis cuiaba campo-grande belo-horizonte belem joao-pessoa curitiba recife teresina rio-de-janeiro natal porto-alegre porto-velho boa-vista florianopolis sao-paulo aracaju palmas brasilia".split(" ")},
  {text:"Cite rios do Brasil", dict:"amazonas sao-francisco parana tocantins tiete paraiba-do-sul xingu tapajos madeira negro paraguai uruguai doce jacui iguacu araguaia".split(" ")},
  {text:"Cite doces típicos brasileiros", dict:"brigadeiro beijinho pacoca pe-de-moleque quindim cocada canjica cajuzinho olho-de-sogra bem-casado bolo-de-rolo romeu-e-julieta doce-de-leite compota goiabada".split(" ")},
  {text:"Cite animais da fauna brasileira", dict:"onca-pintada tamandua tatu capivara jaguatirica lobo-guara arara-azul tucano jacare sagui mico-leao-dourado preguica quati paca cutia veado anta jabuti tartaruga-marinha peixe-boi boto-cor-de-rosa".split(" ")},
  {text:"Cite mamíferos marinhos", dict:"baleia golfinho orca foca leao-marinho morsa peixe-boi boto narval".split(" ")},
  {text:"Cite aves que não voam", dict:"avestruz pinguim ema kiwi casuar".split(" ")},
  {text:"Cite instrumentos de percussão", dict:"bateria pandeiro tamborim atabaque surdo repique tan-tan cuica agogo triangulo xilofone marimba bongo conga timbales caixa reco-reco chocalho tambor".split(" ")},
  {text:"Cite esportes olímpicos", dict:"atletismo natacao ginastica judo boxe luta esgrima ciclismo remo canoagem tenis volei basquete futebol handebol hoquei rugby golfe badminton tiro-com-arco halterofilismo triatlo maratona vela hipismo taekwondo tenis-de-mesa surfe skate".split(" ")},
  {text:"Cite profissões da área da saúde", dict:"medico enfermeiro dentista farmaceutico veterinario nutricionista fisioterapeuta psicologo psiquiatra fonoaudiologo biomedico radiologista anestesista pediatra cardiologista cirurgiao".split(" ")},
  {text:"Cite elementos químicos", dict:"hidrogenio helio litio carbono nitrogenio oxigenio fluor sodio magnesio aluminio silicio fosforo enxofre cloro potassio calcio ferro cobre zinco prata ouro chumbo mercurio iodo".split(" ")},
  {text:"Cite formas geométricas", dict:"circulo quadrado triangulo retangulo pentagono hexagono octogono losango trapezio esfera cubo cilindro cone piramide prisma".split(" ")},
  {text:"Cite constelações", dict:"cruzeiro-do-sul orion escorpiao touro leao ursa-maior ursa-menor cassiopeia gemeos aquario peixes sagitario capricornio".split(" ")},
];

function buildPool(){
  const pool = [];
  let id = 0;
  CATS.forEach(cat=>{
    const normDict = cat.dict.map(normalize);
    // whole category challenge
    pool.push({
      id:id++, text: cat.prefix, difficulty: normDict.length>=80 ? 'baixo':'medio',
      dictSet: new Set(normDict), hasLetter:false
    });
    // letter variants
    const letters = "abcdefghijlmnopqrstuvz".split("");
    letters.forEach(L=>{
      const filtered = normDict.filter(w=>w.startsWith(L));
      if(filtered.length>=3){
        pool.push({
          id:id++, text: cat.prefix+" que começam com a letra "+L.toUpperCase(),
          difficulty: filtered.length>=7?'baixo':'medio',
          dictSet: new Set(filtered), hasLetter:true, letter:L
        });
      }
    });
  });
  FIXED_CHALLENGES.forEach(fc=>{
    pool.push({
      id:id++, text: fc.text, difficulty:'medio',
      dictSet: new Set(fc.dict.map(normalize)), hasLetter:false
    });
  });
  THEMATIC_CHALLENGES.forEach(fc=>{
    pool.push({
      id:id++, text: fc.text, difficulty: fc.dict.length>=15 ? 'baixo':'medio',
      dictSet: new Set(fc.dict.map(normalize)), hasLetter:false
    });
  });
  return pool;
}


module.exports = { normalize, pickRandom, buildPool };
