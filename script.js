// ============================================================
// ASCENCÍON — script.js
// Importa Three.js via importmap (definido no index.html).
// ============================================================
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import * as Backend from './backend.js'

/* ============================================================
   1) DADOS DO JOGO  — EDITA AQUI textos, stats e modelos.
   Põe os teus .glb na pasta /models e escreve o caminho em "model".
   Se "model" for null, aparece um placeholder 3D a rodar.
   ============================================================ */
const characters = [
  {
    id: 'skeleton', name: 'O Esqueleto', role: 'Inimigo', rarity: 'Comum',
    tagline: 'A horda tem um rosto. É este.',
    description: 'A unidade base da horda. Sozinho é frágil; aos milhares, é uma maré de ossos que não para. A cada onda vêm mais rápidos, mais duros e mais numerosos — até tu caíres.',
    stats: { Ameaça: 35, Velocidade: 55, Resistência: 30, Número: 100 },
    model: 'models/Skeleton.glb',
    accent: '#B8863B',
  },
  {
    id: 'crusader', name: 'Crusader Tank', role: 'Chefe', rarity: 'Chefe',
    tagline: 'A cada cinco ondas, o chão treme.',
    description: 'De cinco em cinco ondas, a horda abre alas e ele entra. Blindado dos pés à cabeça e armado com um martelo que não perdoa erros, o Crusader Tank não te persegue — avança. E não há pilar que aguente o embate.',
    stats: { Ameaça: 95, Velocidade: 30, Resistência: 100, Impacto: 92 },
    model: 'models/crusader.fbx',
    textures: {
      'Crusader tank_body': {
        map: 'models/crusader/body_Albedo.jpg',
        normalMap: 'models/crusader/body_Normal.jpg',
        aoMap: 'models/crusader/body_Occlusion.jpg',
        metalnessMap: 'models/crusader/body_Metallic.jpg',
        roughness: 0.6,
      },
      'Crusader tank_blunt': {
        map: 'models/crusader/weapon_Albedo.jpg',
        normalMap: 'models/crusader/weapon_Normal.jpg',
        aoMap: 'models/crusader/weapon_Occlusion.jpg',
        metalnessMap: 'models/crusader/weapon_Metallic.jpg',
        roughness: 0.55,
      },
    },
    accent: '#8A0B20',
  },
]

const weapons = [
  {
    id: 'claymore', name: 'Claymore do Ocaso', type: 'Duas mãos', rarity: 'Jogável',
    tagline: 'Um só golpe, muitos ossos.',
    description: 'Espadão de duas mãos. Golpes largos em arco atingem tudo o que estiver à frente — feito para quando a horda aperta e já não há espaço para recuar.',
    stats: { Dano: 88, Cadência: 45, Alcance: 55, Peso: 80 },
    model: 'models/claymore.glb',
    accent: '#C8102E',
  },
  {
    id: 'machado', name: 'Machado de Duas Mãos', type: 'Duas mãos', rarity: 'Jogável',
    tagline: 'Rápido. Sujo. Eficaz.',
    description: 'Mais leve que a claymore e bem mais rápido. Troca alcance por cadência: menos dano por golpe, mas muitos mais golpes antes de a horda te alcançar.',
    stats: { Dano: 62, Cadência: 85, Alcance: 30, Peso: 40 },
    model: 'models/axe.fbx',
    textures: {
      'Weapons': { map: 'models/axe/texture.png', roughness: 0.7, metalness: 0.15 },
    },
    accent: '#B8863B',
  },
]

const editions = [
  {
    id: 'standard',
    name: 'Ascencíon',
    subtitle: 'Acesso completo',
    price: 5,
    currency: '€',
    highlight: true,
    features: [
      'Jogo completo, sem microtransações',
      '2 armas: Claymore e Machado de duas mãos',
      'Crusader Tank — chefe blindado a cada 5 ondas',
      'A Arena — ondas infinitas de esqueletos',
      'Atualizações futuras incluídas',
      'Acesso ao fórum da comunidade',
    ],
    specs: {
      'Plataforma': 'PC (Windows)',
      'Tamanho': '~107 MB',
      'Idiomas': 'PT, EN',
      'Modo': 'Um jogador',
    },
  },
]

const heroStats = [
  { value: '∞', label: 'Ondas sem teto' },
  { value: '1', label: 'Personagem jogável' },
  { value: '5', label: 'Ondas até ao chefe' },
  { value: '0', label: 'Segundos de descanso' },
]

/* ============================================================
   LINK DE DOWNLOAD DO JOGO
   ------------------------------------------------------------
   O jogo está alojado no Mega. Para trocar de link, muda
   apenas a constante GAME_URL abaixo.
   Se ficar vazia (''), o botão faz o download simulado.

   NOTA: o Mega abre numa aba nova (não descarrega direto),
   porque encripta os ficheiros no navegador. É normal.
   ============================================================ */
const GAME_URL = 'https://mega.nz/file/mglzlSKD#gY_yx8IhF4iDFssuXRrvwLpesUpvg4y6T6w5sbnSpT8'
const GAME_SIZE = '~107 MB'

function gameDownloadUrl() {
  return GAME_URL || null
}

const RARITY_COLOR = { 'Chefe': 'var(--blood-deep)', 'Jogável': 'var(--blood)', 'Lendário': 'var(--blood)', 'Épico': 'var(--gold)', 'Raro': 'var(--ink-soft)', 'Comum': 'var(--ink-soft)' }
const fmt = (n) => n.toFixed(2).replace('.', ',')

/* ============================================================
   2) SUPABASE  — preparado mas inativo.
   Para ativar: mete a tua URL e anon key aqui e descomenta.
   ============================================================ */
const SUPABASE_URL = 'https://tfnzevrbkcdoepmfvmwk.supabase.co' // URL base (sem /rest/v1/)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmbnpldnJia2Nkb2VwbWZ2bXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMzczMzMsImV4cCI6MjA5OTYxMzMzM30.Tp3ZGDDxQA1hcx6sQM1F99uwsaLNAugkM9A_C5wQ6jQ'
let supabase = null
// Se preencheres as duas linhas acima, isto liga sozinho:
if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
// Liga a mesma instância à camada de backend (auth, fórum, avaliações)
Backend.setSupabaseClient(supabase)
/*
  SQL da tabela (SQL Editor do Supabase):
  create table orders (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    edition_id text, edition_name text, amount numeric,
    customer_name text, customer_email text, status text default 'paid'
  );
*/

async function createOrder(payload) {
  const row = {
    edition_id: payload.editionId,
    edition_name: payload.editionName,
    amount: payload.amount,
    customer_name: payload.customer.name,
    customer_email: payload.customer.email,
    status: 'paid',
    payment_method: payload.paymentMethod || null, // ex: "Cartão VISA", "PayPal", "Prenda"
    card_last4: payload.last4 || null,             // SÓ os últimos 4 dígitos
    activation_key: payload.activationKey || null,
    is_gift: !!payload.isGift,
    gift_from: payload.giftFrom || null,           // quem ofereceu
  }

  if (!supabase) {
    // MODO SIMULADO
    await new Promise((r) => setTimeout(r, 1800))
    const order = { id: 'ASC-' + Math.random().toString(36).slice(2, 8).toUpperCase(), created_at: Date.now(), ...row }
    const all = JSON.parse(localStorage.getItem('asc_orders') || '[]')
    all.push(order)
    localStorage.setItem('asc_orders', JSON.stringify(all))
    return order
  }

  const { data, error } = await supabase.from('orders').insert(row).select().single()
  if (error) throw error
  return data
}


/* ============================================================
   3) HERO STATS + ANO DO FOOTER
   ============================================================ */
document.getElementById('heroStats').innerHTML = heroStats.map((s) => `
  <div class="hero__stat"><dt>${s.value}</dt><dd>${s.label}</dd></div>
`).join('')
document.getElementById('footYear').textContent = `© ${new Date().getFullYear()} Ascencíon. Um jogo independente.`

/* ============================================================
   4) FUNDO INTERATIVO — ossos e crânios a flutuar
   ------------------------------------------------------------
   Cada peça é desenhada à mão em canvas (sem imagens), roda
   devagar enquanto sobe, e foge do rato. Há também brasas
   vermelhas pelo meio, para a paleta não ficar monótona.
   ============================================================ */
;(function background() {
  const canvas = document.getElementById('bg-canvas')
  const ctx = canvas.getContext('2d')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let bits = []
  const mouse = { x: -9999, y: -9999 }

  // Tipos de peça e a frequência com que aparecem
  const KINDS = ['bone', 'bone', 'bone', 'skull', 'rib', 'vertebra', 'ember', 'ember']

  function spawn(atBottom = true) {
    const kind = KINDS[Math.floor(Math.random() * KINDS.length)]
    const isEmber = kind === 'ember'
    return {
      kind,
      x: Math.random() * canvas.width,
      y: atBottom ? canvas.height + Math.random() * 260 : Math.random() * canvas.height,
      size: isEmber
        ? Math.random() * 2.2 + 0.6
        : Math.random() * 9 + 6,          // ossos entre 6 e 15 px
      speed: (Math.random() * 0.42 + 0.12) * (isEmber ? 1.3 : 1),
      drift: (Math.random() - 0.5) * 0.35,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.012, // rotação lenta
      alpha: isEmber
        ? Math.random() * 0.45 + 0.15
        : Math.random() * 0.22 + 0.07,    // ossos discretos, não distraem
      vx: 0, vy: 0,                        // empurrão do rato
    }
  }

  function resize() {
    canvas.width = innerWidth
    canvas.height = innerHeight
    const density = reduced ? 46000 : 26000
    const count = Math.floor((canvas.width * canvas.height) / density)
    bits = Array.from({ length: count }, () => spawn(false))
  }

  /* ---------- Desenho de cada peça (unidade 1 = size) ---------- */

  // Osso longo clássico (fémur estilizado)
  function drawBone(c, s) {
    const w = s * 0.19
    c.beginPath()
    c.moveTo(-s * 0.42, 0)
    c.lineTo(s * 0.42, 0)
    c.lineWidth = w
    c.lineCap = 'round'
    c.stroke()
    // as quatro "bolas" das pontas
    const r = s * 0.15
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        c.beginPath()
        c.arc(sx * s * 0.44, sy * r * 0.85, r, 0, Math.PI * 2)
        c.fill()
      }
    }
  }

  // Crânio: cabeça + maxilar + órbitas
  function drawSkull(c, s, alpha) {
    c.beginPath()
    c.arc(0, -s * 0.06, s * 0.34, Math.PI, 0)          // topo redondo
    c.lineTo(s * 0.34, s * 0.16)
    c.lineTo(-s * 0.34, s * 0.16)
    c.closePath()
    c.fill()
    // maxilar (sem roundRect, para funcionar em navegadores antigos)
    c.beginPath()
    c.rect(-s * 0.2, s * 0.16, s * 0.4, s * 0.16)
    c.fill()
    // órbitas: pintadas na cor do fundo (não apagam o que está por trás)
    const prev = c.fillStyle
    c.fillStyle = `rgba(247,244,239,${Math.min(1, alpha * 3.2)})`
    for (const sx of [-1, 1]) {
      c.beginPath()
      c.ellipse(sx * s * 0.14, -s * 0.05, s * 0.09, s * 0.11, 0, 0, Math.PI * 2)
      c.fill()
    }
    c.fillStyle = prev
  }

  // Costela (arco)
  function drawRib(c, s) {
    c.beginPath()
    c.arc(0, 0, s * 0.4, Math.PI * 0.15, Math.PI * 0.85)
    c.lineWidth = s * 0.11
    c.lineCap = 'round'
    c.stroke()
  }

  // Vértebra (corpo + espinhas)
  function drawVertebra(c, s) {
    c.beginPath()
    c.arc(0, 0, s * 0.18, 0, Math.PI * 2)
    c.fill()
    c.lineWidth = s * 0.09
    c.lineCap = 'round'
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4
      c.beginPath()
      c.moveTo(Math.cos(a) * s * 0.16, Math.sin(a) * s * 0.16)
      c.lineTo(Math.cos(a) * s * 0.34, Math.sin(a) * s * 0.34)
      c.stroke()
    }
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const b of bits) {
      // movimento base: sobe devagar
      b.y -= b.speed * (reduced ? 0.35 : 1)
      b.x += b.drift
      b.rot += b.spin * (reduced ? 0.3 : 1)

      // fuga do rato (com inércia, para ficar natural)
      if (!reduced) {
        const dx = b.x - mouse.x
        const dy = b.y - mouse.y
        const dist = Math.hypot(dx, dy)
        const R = 150
        if (dist < R && dist > 0.1) {
          const f = (R - dist) / R
          b.vx += (dx / dist) * f * 0.9
          b.vy += (dy / dist) * f * 0.9
          b.spin += f * 0.004            // giram ao ser empurrados
        }
      }
      b.x += b.vx
      b.y += b.vy
      b.vx *= 0.92                       // travagem suave
      b.vy *= 0.92

      // reciclar ao sair do ecrã
      if (b.y < -60 || b.x < -80 || b.x > canvas.width + 80) Object.assign(b, spawn())

      // desenhar
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.rot)

      if (b.kind === 'ember') {
        ctx.fillStyle = `rgba(200,16,46,${b.alpha})`
        ctx.shadowBlur = 8
        ctx.shadowColor = 'rgba(200,16,46,0.6)'
        ctx.beginPath()
        ctx.arc(0, 0, b.size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const col = `rgba(82,75,69,${b.alpha})`
        ctx.fillStyle = col
        ctx.strokeStyle = col
        if (b.kind === 'bone') drawBone(ctx, b.size)
        else if (b.kind === 'skull') drawSkull(ctx, b.size, b.alpha)
        else if (b.kind === 'rib') drawRib(ctx, b.size)
        else drawVertebra(ctx, b.size)
      }
      ctx.restore()
    }
    requestAnimationFrame(tick)
  }

  addEventListener('resize', resize)
  addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY })
  addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999 })
  resize()
  tick()
})()

/* ============================================================
   5) NAVBAR (scroll + menu mobile)
   ============================================================ */
const nav = document.getElementById('nav')
addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 40))
const burger = document.getElementById('burger')
const navMobile = document.getElementById('navMobile')
burger.addEventListener('click', () => {
  const open = navMobile.classList.toggle('is-open')
  burger.setAttribute('aria-expanded', open)
})
navMobile.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => { navMobile.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false') })
)

/* ============================================================
   6) REVEAL AO SCROLL
   ============================================================ */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) } })
}, { threshold: 0.15 })
document.querySelectorAll('.reveal').forEach((el) => io.observe(el))

/* ============================================================
   7) VISUALIZADOR 3D (Three.js)
   ============================================================ */
const ViewerCanvas = document.getElementById('viewerCanvas')
let renderer, scene, camera, controls, currentObject, envMap
const loader = new GLTFLoader()
const fbxLoader = new FBXLoader()

function init3D() {
  const w = ViewerCanvas.clientWidth, h = ViewerCanvas.clientHeight
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setSize(w, h)
  ViewerCanvas.appendChild(renderer.domElement)

  scene = new THREE.Scene()

  const pmrem = new THREE.PMREMGenerator(renderer)
  envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envMap

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
  camera.position.set(0, 0.5, 4)

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(5, 5, 5); scene.add(key)
  const rim = new THREE.DirectionalLight(0xC8102E, 0.6); rim.position.set(-5, 2, -3); scene.add(rim)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.2
  controls.minDistance = 2.5
  controls.maxDistance = 7

  addEventListener('resize', onResize3D)
  animate3D()
}
function onResize3D() {
  if (!renderer) return
  const w = ViewerCanvas.clientWidth, h = ViewerCanvas.clientHeight
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix()
}
function animate3D() {
  requestAnimationFrame(animate3D)
  if (controls) controls.update()
  if (renderer) renderer.render(scene, camera)
}

function clearObject() {
  if (currentObject) { scene.remove(currentObject); currentObject.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.() }); currentObject = null }
}
function showLoading(on) {
  let el = ViewerCanvas.querySelector('.viewer__loading')
  if (on) { if (!el) { el = document.createElement('div'); el.className = 'viewer__loading'; el.textContent = 'A carregar…'; ViewerCanvas.appendChild(el) } }
  else if (el) el.remove()
}
function makePlaceholder(accentHex) {
  const g = new THREE.Group()
  const color = new THREE.Color(accentHex)
  const solid = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0),
    new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.2, flatShading: true }))
  const wire = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.25 }))
  wire.scale.setScalar(1.35)
  g.add(solid); g.add(wire)
  return g
}
function frameObject(obj) {
  // 1ª passagem: medir o modelo no tamanho original
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = 2.6 / maxDim
  obj.scale.setScalar(scale)

  // 2ª passagem: recentrar em X/Z e assentar a base perto do fundo da vista
  const box2 = new THREE.Box3().setFromObject(obj)
  const center2 = box2.getCenter(new THREE.Vector3())
  obj.position.x -= center2.x
  obj.position.z -= center2.z
  // centra verticalmente, com leve deslocamento para baixo (fica mais natural)
  obj.position.y -= center2.y
}
function loadModel(item) {
  if (!renderer) init3D()
  clearObject()

  if (!item.model) {
    currentObject = makePlaceholder(item.accent)
    scene.add(currentObject)
    return
  }

  showLoading(true)
  const isFbx = item.model.toLowerCase().endsWith('.fbx')

  const onDone = (obj) => {
    showLoading(false)
    // Se o item tiver texturas definidas, aplicamo-las à mão
    if (item.textures) applyTextures(obj, item.textures)
    currentObject = obj
    frameObject(currentObject)
    scene.add(currentObject)
  }
  const onFail = (err) => {
    console.warn('Falha ao carregar modelo, a usar placeholder:', err)
    showLoading(false)
    currentObject = makePlaceholder(item.accent)
    scene.add(currentObject)
  }

  if (isFbx) {
    fbxLoader.load(item.model, (obj) => onDone(obj), undefined, onFail)
  } else {
    loader.load(item.model, (gltf) => onDone(gltf.scene), undefined, onFail)
  }
}

/* ------------------------------------------------------------
   Aplica texturas a um modelo FBX pelo nome do material.
   item.textures = {
     'NomeDoMaterialNoFBX': { map, normalMap, aoMap, metalnessMap }
   }
   ------------------------------------------------------------ */
const _texCache = {}
function loadTex(path, srgb = false) {
  if (_texCache[path]) return _texCache[path]
  const t = new THREE.TextureLoader().load(path)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.flipY = false // FBX usa UVs invertidos
  _texCache[path] = t
  return t
}

function applyTextures(root, mapping) {
  root.traverse((child) => {
    if (!child.isMesh) return
    const mats = Array.isArray(child.material) ? child.material : [child.material]
    const newMats = mats.map((m) => {
      const cfg = mapping[m.name]
      if (!cfg) return m // material sem correspondência: deixa como está
      const std = new THREE.MeshStandardMaterial({
        map: cfg.map ? loadTex(cfg.map, true) : null,
        normalMap: cfg.normalMap ? loadTex(cfg.normalMap) : null,
        aoMap: cfg.aoMap ? loadTex(cfg.aoMap) : null,
        metalnessMap: cfg.metalnessMap ? loadTex(cfg.metalnessMap) : null,
        aoMapIntensity: 0.9,
        roughness: cfg.roughness ?? 0.75,
        metalness: cfg.metalnessMap ? 1.0 : (cfg.metalness ?? 0.1),
      })
      return std
    })
    child.material = Array.isArray(child.material) ? newMats : newMats[0]
    // o aoMap precisa de um segundo canal UV
    const g = child.geometry
    if (g && g.attributes.uv && !g.attributes.uv1) g.setAttribute('uv1', g.attributes.uv)
  })
}


/* ============================================================
   8) GALERIA (abas, lista, detalhe)
   ============================================================ */
const galleryList = document.getElementById('galleryList')
const galleryDetail = document.getElementById('galleryDetail')
let currentTab = 'characters'
let activeId = characters[0].id

function currentItems() { return currentTab === 'characters' ? characters : weapons }

function renderList() {
  const items = currentItems()
  galleryList.innerHTML = items.map((it) => `
    <button class="chip ${it.id === activeId ? 'is-active' : ''}" data-id="${it.id}" style="--chip-accent:${it.accent}">
      <span class="chip__name">${it.name}</span>
      <span class="chip__rarity" style="color:${RARITY_COLOR[it.rarity]}">${it.rarity}</span>
    </button>
  `).join('')
  galleryList.querySelectorAll('.chip').forEach((c) =>
    c.addEventListener('click', () => selectItem(c.dataset.id))
  )
}
function renderDetail() {
  const it = currentItems().find((i) => i.id === activeId)
  galleryDetail.innerHTML = `
    <span class="detail__rarity" style="color:${RARITY_COLOR[it.rarity]}">${it.rarity} · ${it.role || it.type}</span>
    <h3 class="detail__name">${it.name}</h3>
    <p class="detail__tagline">${it.tagline}</p>
    <p class="detail__desc">${it.description}</p>
    <div class="detail__stats">
      ${Object.entries(it.stats).map(([k, v]) => `
        <div class="stat">
          <div class="stat__head"><span>${k}</span><span class="stat__num">${v}</span></div>
          <div class="stat__track"><div class="stat__fill" data-w="${v}"></div></div>
        </div>`).join('')}
    </div>`
  // reinicia animação do detalhe
  galleryDetail.style.animation = 'none'; void galleryDetail.offsetWidth; galleryDetail.style.animation = ''
  requestAnimationFrame(() => galleryDetail.querySelectorAll('.stat__fill').forEach((f) => f.style.width = f.dataset.w + '%'))
}
function selectItem(id) {
  activeId = id
  renderList(); renderDetail()
  loadModel(currentItems().find((i) => i.id === id))
}
document.querySelectorAll('.gallery__tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    document.querySelectorAll('.gallery__tab').forEach((t) => t.classList.remove('is-active'))
    tab.classList.add('is-active')
    currentTab = tab.dataset.tab
    activeId = currentItems()[0].id
    selectItem(activeId)
  })
)
// arranque da galeria (init 3D só quando entra na vista, para poupar)
const galleryObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    renderList(); renderDetail(); loadModel(currentItems().find((i) => i.id === activeId))
    galleryObserver.disconnect()
  }
}, { threshold: 0.1 })
galleryObserver.observe(document.getElementById('galeria'))

/* ============================================================
   9) MAPA
   ------------------------------------------------------------
   A secção "O Mundo" é agora escrita diretamente no index.html
   (conteúdo fixo, mais rico). Só ligamos as animações de entrada.
   ============================================================ */
document.querySelectorAll('#mapa .reveal').forEach((el) => io.observe(el))

/* ============================================================
   10) ONDAS (simulador)
   ============================================================ */
const slider = document.getElementById('waveSlider')
const elValue = document.getElementById('waveValue')
const elBoss = document.getElementById('waveBoss')
const elEnemies = document.getElementById('mEnemies')
const elHp = document.getElementById('mHp')
const elPDmg = document.getElementById('mPDmg')
const elPHp = document.getElementById('mPHp')
const chart = document.getElementById('waveChart')

/* ------------------------------------------------------------
   Valores REAIS do jogo, por onda:
     Inimigos : 2 na onda 1, +2 por onda      -> 2, 4, 6, 8...
     Vida      : 100 na onda 1, +15 por onda  -> 100, 115, 130...
     Jogador   : +5 dano e +5 vida a cada 2 ondas
                 (começa com 25 de dano e 100 de vida)
     Chefe     : Crusader Tank a cada 5 ondas
   ------------------------------------------------------------ */
function computeWave(n) {
  const upgrades = Math.floor((n - 1) / 2) // sobe de 2 em 2 ondas
  return {
    enemies: 2 * n,
    hp: 100 + 15 * (n - 1),
    playerDmg: 25 + 5 * upgrades,
    playerHp: 100 + 5 * upgrades,
    isBoss: n % 5 === 0,
  }
}
function bump(el) { el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 300) }

function renderChart(wave) {
  chart.innerHTML = ''
  const N = 12
  // escala relativa às 12 ondas visíveis (crescimento é linear)
  const maxE = computeWave(wave + N - 1).enemies
  for (let i = 0; i < N; i++) {
    const n = wave + i
    const d = computeWave(n)
    const h = Math.max(6, (d.enemies / maxE) * 100)
    const bar = document.createElement('div')
    bar.className = 'bar' + (i === 0 ? ' is-current' : '') + (d.isBoss ? ' is-boss' : '')
    bar.style.height = h + '%'
    bar.title = `Onda ${n}: ${d.enemies} esqueletos${d.isBoss ? ' + Crusader Tank' : ''}`
    bar.innerHTML = `<span class="bar__n">${n}</span>`
    chart.appendChild(bar)
  }
}
function updateWave() {
  const n = +slider.value
  const d = computeWave(n)
  elValue.textContent = String(n).padStart(2, '0')
  elBoss.hidden = !d.isBoss
  elEnemies.textContent = d.enemies; bump(elEnemies)
  elHp.textContent = d.hp; bump(elHp)
  elPDmg.textContent = d.playerDmg; bump(elPDmg)
  elPHp.textContent = d.playerHp; bump(elPHp)
  renderChart(n)
}
slider.addEventListener('input', updateWave)
updateWave()

/* ============================================================
   11) PREÇOS
   ============================================================ */
const ed0 = editions[0]
document.getElementById('pricingGrid').innerHTML = `
  <article class="plan plan--solo reveal">
    <div class="plan__left">
      <span class="plan__badge">Edição completa</span>
      <h3 class="plan__name">${ed0.name}</h3>
      <p class="plan__subtitle">${ed0.subtitle}</p>
      <ul class="plan__features">
        ${ed0.features.map((f) => `<li><span class="plan__check">✕</span>${f}</li>`).join('')}
      </ul>
      <div class="plan__specs">
        ${Object.entries(ed0.specs).map(([k, v]) => `
          <div class="spec"><span class="spec__k">${k}</span><span class="spec__v">${v}</span></div>`).join('')}
      </div>
    </div>
    <div class="plan__right">
      <div class="plan__pricebox">
        <div class="plan__price">
          <span class="plan__currency">${ed0.currency}</span>
          <span class="plan__value">${fmt(ed0.price)}</span>
        </div>
        <span class="plan__once">Pagamento único</span>
      </div>
      <button class="btn plan__cta" data-buy-edition="${ed0.id}">Comprar agora</button>
      <p class="plan__guarantee">✓ Acesso imediato · ✓ Chave de ativação instantânea</p>
      <div class="plan__payicons">
        <span title="Cartão">💳</span>
        <span title="PayPal">PayPal</span>
        <span title="Apple Pay">Apple&nbsp;Pay</span>
        <span title="Google Pay">G&nbsp;Pay</span>
      </div>
    </div>
  </article>`
document.querySelectorAll('#pricingGrid .reveal').forEach((el) => io.observe(el))

/* ============================================================
   12) CHECKOUT (modal)
   ============================================================ */
const overlay = document.getElementById('modalOverlay')
const modalContent = document.getElementById('modalContent')
const modalClose = document.getElementById('modalClose')
let currentEdition = null

function openCheckout(edition) {
  currentEdition = edition || editions.find((e) => e.highlight) || editions[0]
  overlay.hidden = false
  document.body.style.overflow = 'hidden'
  renderForm()
}
function closeCheckout() {
  overlay.hidden = true
  document.body.style.overflow = ''
  modalContent.innerHTML = ''
}
modalClose.addEventListener('click', closeCheckout)
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCheckout() })
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) closeCheckout() })

// botões "comprar" (navbar, hero)
document.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => openCheckout()))
// botões por edição (delegação, pois são criados dinamicamente)
document.getElementById('pricingGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-buy-edition]')
  if (btn) openCheckout(editions.find((ed) => ed.id === btn.dataset.buyEdition))
})

let giftMode = false

function renderForm() {
  const ed = currentEdition
  modalContent.innerHTML = `
    <p class="eyebrow">Checkout seguro</p>
    <h3 class="modal__title">${ed.name}</h3>
    <div class="co__summary">
      <div class="co__item">
        <span class="co__itemname">${ed.name} — ${ed.subtitle}</span>
        <span class="co__itemprice">${ed.currency} ${fmt(ed.price)}</span>
      </div>
      <div class="co__total">
        <span>Total</span>
        <strong>${ed.currency} ${fmt(ed.price)}</strong>
      </div>
    </div>

    <div class="co__gift">
      <label class="co__giftrow">
        <input type="checkbox" id="giftToggle" ${giftMode ? 'checked' : ''} />
        <span class="co__giftbox"></span>
        <span class="co__gifttext">🎁 Isto é uma prenda para outra pessoa</span>
      </label>
      <p class="co__gifthint" id="giftHint" ${giftMode ? '' : 'hidden'}>
        A chave vai para o e-mail que indicares. O jogo fica na conta de quem a ativar.
      </p>
    </div>

    <p class="co__label">Método de pagamento</p>
    <div class="co__methods" id="coMethods">
      <button class="co__method is-active" data-pm="card"><span class="co__mi">💳</span>Cartão</button>
      <button class="co__method" data-pm="paypal"><span class="co__mi">🅿️</span>PayPal</button>
      <button class="co__method" data-pm="apple"><span class="co__mi"></span>Apple Pay</button>
      <button class="co__method" data-pm="google"><span class="co__mi">G</span>Google Pay</button>
    </div>

    <div id="coPanel"></div>

    <p class="modal__note">🔒 Ligação encriptada · Pagamento simulado para demonstração</p>`

  modalContent.querySelectorAll('.co__method').forEach((b) =>
    b.addEventListener('click', () => {
      modalContent.querySelectorAll('.co__method').forEach((x) => x.classList.remove('is-active'))
      b.classList.add('is-active')
      renderMethodPanel(b.dataset.pm)
    })
  )
  const gt = modalContent.querySelector('#giftToggle')
  if (gt) gt.addEventListener('change', () => {
    giftMode = gt.checked
    modalContent.querySelector('#giftHint').hidden = !giftMode
    // re-renderiza o painel ativo para mudar os rótulos dos campos
    const active = modalContent.querySelector('.co__method.is-active')
    renderMethodPanel(active ? active.dataset.pm : 'card')
  })

  renderMethodPanel('card')
}

// ---- Painel de cada método ----
function renderMethodPanel(pm) {
  const ed = currentEdition
  const panel = modalContent.querySelector('#coPanel')
  const total = `${ed.currency} ${fmt(ed.price)}`
  // em modo prenda, o e-mail é o de quem RECEBE
  const emailLabel = giftMode ? 'E-mail de quem recebe a prenda' : 'E-mail'
  const emailPh = giftMode ? 'email@dapessoa.com' : 'para receber a chave' 

  if (pm === 'card') {
    panel.innerHTML = `
      <div class="field"><label>Nome no cartão</label><input id="f-name" placeholder="Como aparece no cartão" /><span class="field__err" id="e-name"></span></div>
      <div class="field"><label>${emailLabel}</label><input id="f-email" placeholder="${emailPh}" /><span class="field__err" id="e-email"></span></div>
      <div class="field co__cardfield">
        <label>Número do cartão</label>
        <input id="f-card" placeholder="0000 0000 0000 0000" inputmode="numeric" />
        <span class="co__brand" id="coBrand"></span>
        <span class="field__err" id="e-card"></span>
      </div>
      <div class="field-row">
        <div class="field"><label>Validade</label><input id="f-exp" placeholder="MM/AA" inputmode="numeric" /><span class="field__err" id="e-exp"></span></div>
        <div class="field"><label>CVV</label><input id="f-cvv" placeholder="123" inputmode="numeric" /><span class="field__err" id="e-cvv"></span></div>
      </div>
      <button class="btn modal__pay" id="payBtn">Pagar ${total}</button>`

    const card = panel.querySelector('#f-card')
    const exp = panel.querySelector('#f-exp')
    const cvv = panel.querySelector('#f-cvv')
    card.addEventListener('input', () => {
      card.value = card.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
      panel.querySelector('#coBrand').textContent = cardBrand(card.value)
    })
    exp.addEventListener('input', () => { exp.value = exp.value.replace(/\D/g, '').slice(0, 4).replace(/(.{2})(.+)/, '$1/$2') })
    cvv.addEventListener('input', () => { cvv.value = cvv.value.replace(/\D/g, '').slice(0, 3) })
    panel.querySelector('#payBtn').addEventListener('click', () => submitCard())

  } else if (pm === 'paypal') {
    panel.innerHTML = `
      <div class="co__alt">
        <div class="co__altlogo">🅿️ PayPal</div>
        <p class="co__alttext">Vais ser reencaminhado para o PayPal para concluir o pagamento em segurança.</p>
        <div class="field"><label>${emailLabel}</label><input id="f-email" placeholder="${emailPh}" /><span class="field__err" id="e-email"></span></div>
        <button class="btn modal__pay co__paypal" id="payBtn">Continuar para o PayPal</button>
      </div>`
    panel.querySelector('#payBtn').addEventListener('click', () => submitWallet('PayPal'))

  } else {
    const isApple = pm === 'apple'
    panel.innerHTML = `
      <div class="co__alt">
        <div class="co__altlogo">${isApple ? ' Apple Pay' : 'G Pay'}</div>
        <p class="co__alttext">Confirma o pagamento de <strong>${total}</strong> com ${isApple ? 'Face ID / Touch ID' : 'a tua conta Google'}.</p>
        <div class="field"><label>${emailLabel}</label><input id="f-email" placeholder="${emailPh}" /><span class="field__err" id="e-email"></span></div>
        <button class="btn modal__pay ${isApple ? 'co__apple' : 'co__google'}" id="payBtn">
          ${isApple ? ' Pagar com Apple Pay' : 'Pagar com Google Pay'}
        </button>
      </div>`
    panel.querySelector('#payBtn').addEventListener('click', () => submitWallet(isApple ? 'Apple Pay' : 'Google Pay'))
  }
}

// Deteta a bandeira do cartão pelo primeiro dígito
function cardBrand(num) {
  const n = num.replace(/\s/g, '')
  if (/^4/.test(n)) return 'VISA'
  if (/^5[1-5]/.test(n)) return 'MASTERCARD'
  if (/^3[47]/.test(n)) return 'AMEX'
  if (/^6/.test(n)) return 'DISCOVER'
  return ''
}

// Algoritmo de Luhn — valida se o número de cartão é plausível
function luhnValid(num) {
  const n = num.replace(/\D/g, '')
  if (n.length !== 16) return false
  let sum = 0, alt = false
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i], 10)
    if (alt) { d *= 2; if (d > 9) d -= 9 }
    sum += d; alt = !alt
  }
  return sum % 10 === 0
}

function submitCard() {
  const g = (id) => modalContent.querySelector(id)?.value.trim() || ''
  const setErr = (id, msg) => { const el = modalContent.querySelector(id); if (el) el.textContent = msg || '' }
  const name = g('#f-name'), email = g('#f-email')
  const cardv = g('#f-card').replace(/\s/g, ''), exp = g('#f-exp'), cvv = g('#f-cvv')

  let ok = true
  ;['#e-name', '#e-email', '#e-card', '#e-exp', '#e-cvv'].forEach((i) => setErr(i, ''))
  if (name.length < 3) { setErr('#e-name', 'Indica o nome do titular'); ok = false }
  if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('#e-email', 'E-mail inválido'); ok = false }
  if (cardv.length !== 16) { setErr('#e-card', 'O cartão deve ter 16 dígitos'); ok = false }
  else if (!luhnValid(cardv)) { setErr('#e-card', 'Número de cartão inválido'); ok = false }
  if (!/^\d{2}\/\d{2}$/.test(exp)) { setErr('#e-exp', 'Usa MM/AA'); ok = false }
  else {
    const [mm, aa] = exp.split('/').map(Number)
    const now = new Date(); const yy = now.getFullYear() % 100
    if (mm < 1 || mm > 12) { setErr('#e-exp', 'Mês inválido'); ok = false }
    else if (aa < yy || (aa === yy && mm < now.getMonth() + 1)) { setErr('#e-exp', 'Cartão expirado'); ok = false }
  }
  if (cvv.length !== 3) { setErr('#e-cvv', 'CVV inválido'); ok = false }
  if (!ok) return

  doPayment({
    name, email,
    method: 'Cartão ' + (cardBrand(cardv) || ''),
    last4: cardv.slice(-4), // SÓ os últimos 4 — o resto nunca é guardado
    isGift: giftMode, giftFrom: giftMode ? (currentUser?.email || email) : null,
  })
}

function submitWallet(method) {
  const setErr = (id, msg) => { const el = modalContent.querySelector(id); if (el) el.textContent = msg || '' }
  const email = modalContent.querySelector('#f-email')?.value.trim() || ''
  setErr('#e-email', '')
  if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('#e-email', 'E-mail inválido'); return }
  const name = currentUser?.name || email.split('@')[0]
  doPayment({
    name, email, method,
    isGift: giftMode, giftFrom: giftMode ? (currentUser?.email || email) : null,
  })
}

async function doPayment({ name, email, method, last4, isGift, giftFrom }) {
  renderProcessing(method)
  const activationKey = genKey()
  try {
    const order = await createOrder({
      editionId: currentEdition.id,
      editionName: currentEdition.name,
      amount: isGift ? currentEdition.price : currentEdition.price,
      customer: { name, email },
      paymentMethod: method,
      last4: last4 || null,
      activationKey,
      isGift: !!isGift,
      giftFrom: giftFrom || null,
    })
    renderSuccess(order, email, method, last4, activationKey, isGift)
  } catch (e) {
    renderError(e?.message)
  }
}


function renderProcessing(method) {
  modalContent.innerHTML = `
    <div class="modal__state">
      <div class="spinner"></div>
      <h3 class="modal__title">A processar…</h3>
      <p class="modal__sub">A confirmar o pagamento com ${escapeHtml(method || 'o fornecedor')}.<br />Não feches a janela.</p>
      <div class="co__steps">
        <span class="co__step is-on">Autorização</span>
        <span class="co__step" id="st2">Validação</span>
        <span class="co__step" id="st3">Emissão da chave</span>
      </div>
    </div>`
  setTimeout(() => modalContent.querySelector('#st2')?.classList.add('is-on'), 700)
  setTimeout(() => modalContent.querySelector('#st3')?.classList.add('is-on'), 1400)
}

// Gera uma chave de ativação no estilo XXXX-XXXX-XXXX-XXXX
function genKey() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const block = () => Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('')
  return `ASC-${block()}-${block()}-${block()}`
}

function renderSuccess(order, email, method, last4, key, isGift) {
  modalContent.innerHTML = `
    <div class="modal__state">
      <div class="checkmark">${isGift ? '🎁' : '✓'}</div>
      <h3 class="modal__title">${isGift ? 'Prenda enviada' : 'Bem-vindo à horda'}</h3>
      <p class="modal__sub">
        ${isGift
          ? `A chave foi enviada para <strong>${escapeHtml(email)}</strong>.<br />Quando a pessoa a ativar, o jogo fica na conta dela.`
          : `Pagamento confirmado via ${escapeHtml(method || '')}${last4 ? ` ••••${last4}` : ''}.<br />Enviámos os detalhes para <strong>${escapeHtml(email)}</strong>.`}
      </p>

      <div class="co__keybox">
        <span class="co__keylabel">${isGift ? 'Chave da prenda' : 'A tua chave de ativação'}</span>
        <div class="co__keyrow">
          <code class="co__key" id="coKey">${key}</code>
          <button class="co__copy" id="coCopy" title="Copiar">⧉</button>
        </div>
        <span class="co__keyhint" id="coCopied"></span>
      </div>

      ${isGift ? '' : `
        <a class="btn co__download" id="coDownload" href="${gameDownloadUrl() || '#'}" ${gameDownloadUrl() ? 'target="_blank" rel="noopener"' : ''}>⬇ Descarregar o jogo</a>
        <p class="co__dlnote">Windows · ${GAME_SIZE} · Abre numa aba nova</p>`}
      <p class="modal__order">Pedido #${escapeHtml(String(order.id))}</p>
      <button class="btn btn--ghost" id="doneBtn">Concluir</button>
    </div>`

  modalContent.querySelector('#coCopy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(key)
      modalContent.querySelector('#coCopied').textContent = '✓ Chave copiada'
    } catch {
      modalContent.querySelector('#coCopied').textContent = 'Copia manualmente'
    }
  })

  const dl = modalContent.querySelector('#coDownload')
  if (dl) dl.addEventListener('click', (e) => {
    const btn = e.currentTarget
    if (!gameDownloadUrl()) e.preventDefault() // sem link: só simula
    btn.textContent = '✓ A abrir…'
    setTimeout(() => { btn.textContent = '⬇ Descarregar o jogo' }, 2500)
  })


  modalContent.querySelector('#doneBtn').addEventListener('click', closeCheckout)
}

function renderError(msg) {
  modalContent.innerHTML = `
    <div class="modal__state">
      <div class="checkmark checkmark--err">✕</div>
      <h3 class="modal__title">Pagamento recusado</h3>
      <p class="modal__sub">${escapeHtml(msg || 'Algo correu mal. Tenta novamente.')}</p>
      <button class="btn" id="retryBtn">Tentar de novo</button>
    </div>`
  modalContent.querySelector('#retryBtn').addEventListener('click', renderForm)
}

/* ============================================================
   13) AUTENTICAÇÃO (UI) + estado de sessão
   ============================================================ */
let currentUser = null

const accountBtn = document.getElementById('accountBtn')
const accountBtnMobile = document.getElementById('accountBtnMobile')
const authOverlay = document.getElementById('authOverlay')
const authContent = document.getElementById('authContent')
const authClose = document.getElementById('authClose')

const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'agora mesmo'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  return `há ${Math.floor(s / 86400)} d`
}

function openAuth() { authOverlay.hidden = false; document.body.style.overflow = 'hidden'; currentUser ? renderAccount() : renderAuthForm('login') }
function closeAuth() { authOverlay.hidden = true; document.body.style.overflow = ''; authContent.innerHTML = '' }
accountBtn.addEventListener('click', openAuth)
accountBtnMobile.addEventListener('click', openAuth)
authClose.addEventListener('click', closeAuth)
authOverlay.addEventListener('click', (e) => { if (e.target === authOverlay) closeAuth() })
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !authOverlay.hidden) closeAuth() })

function renderAuthForm(mode) {
  const isLogin = mode === 'login'
  authContent.innerHTML = `
    <div class="auth__tabs">
      <button class="auth__tab ${isLogin ? 'is-active' : ''}" data-mode="login">Entrar</button>
      <button class="auth__tab ${!isLogin ? 'is-active' : ''}" data-mode="signup">Criar conta</button>
    </div>
    <h3 class="modal__title">${isLogin ? 'Bem-vindo de volta' : 'Junta-te à horda'}</h3>
    ${isLogin ? '' : `
      <div class="field"><label>Nome</label><input id="a-name" placeholder="O teu nome" /><span class="field__err" id="ea-name"></span></div>`}
    <div class="field"><label>E-mail</label><input id="a-email" placeholder="tu@email.com" /><span class="field__err" id="ea-email"></span></div>
    <div class="field">
      <div class="auth__passrow">
        <label>Palavra-passe</label>
        ${isLogin ? '<button class="auth__forgot" id="forgotBtn">Esqueci-me</button>' : ''}
      </div>
      <input id="a-pass" type="password" placeholder="mín. 6 caracteres" />
      <span class="field__err" id="ea-pass"></span>
    </div>
    <button class="btn modal__pay" id="authSubmit">${isLogin ? 'Entrar' : 'Criar conta'}</button>
    <p class="auth__note">${isLive() ? 'Ao criar conta receberás um e-mail de confirmação.' : '🔒 Modo demonstração — os dados ficam guardados só neste navegador.'}</p>`

  authContent.querySelectorAll('.auth__tab').forEach((t) =>
    t.addEventListener('click', () => renderAuthForm(t.dataset.mode))
  )
  authContent.querySelector('#authSubmit').addEventListener('click', () => submitAuth(mode))
  authContent.querySelectorAll('input').forEach((inp) =>
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAuth(mode) })
  )
  const fb = authContent.querySelector('#forgotBtn')
  if (fb) fb.addEventListener('click', () => {
    // leva o email já escrito, se houver
    const pre = authContent.querySelector('#a-email')?.value.trim() || ''
    renderForgotForm(pre)
  })
}

/* ---------- Esqueci-me da palavra-passe ---------- */
function renderForgotForm(prefill = '') {
  authContent.innerHTML = `
    <button class="auth__back" id="backToLogin">← Voltar</button>
    <p class="eyebrow">Recuperação</p>
    <h3 class="modal__title">Esqueceste-te?</h3>
    <p class="modal__sub">
      Acontece. Escreve o teu e-mail e enviamos-te um link para
      definires uma palavra-passe nova.
    </p>
    <div class="field">
      <label>E-mail da conta</label>
      <input id="r-email" placeholder="tu@email.com" value="${escapeHtml(prefill)}" />
      <span class="field__err" id="er-email"></span>
    </div>
    <button class="btn modal__pay" id="resetSubmit">Enviar link de recuperação</button>
    <p class="auth__note">O link expira em 1 hora e só pode ser usado uma vez.</p>`

  authContent.querySelector('#backToLogin').addEventListener('click', () => renderAuthForm('login'))
  authContent.querySelector('#resetSubmit').addEventListener('click', submitForgot)
  authContent.querySelector('#r-email').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitForgot() })
}

async function submitForgot() {
  const input = authContent.querySelector('#r-email')
  const err = authContent.querySelector('#er-email')
  const email = input.value.trim()
  err.textContent = ''
  if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'E-mail inválido'; return }

  const btn = authContent.querySelector('#resetSubmit')
  btn.textContent = 'A enviar…'; btn.disabled = true
  try {
    const res = await Backend.requestPasswordReset(email)
    // Nota: mostramos sempre a mesma mensagem, exista ou não a conta.
    // É a prática correta — não revelar que e-mails estão registados.
    authContent.innerHTML = `
      <div class="modal__state">
        <div class="checkmark">✉</div>
        <h3 class="modal__title">Verifica o teu e-mail</h3>
        <p class="modal__sub">
          Se existir uma conta associada a <strong>${escapeHtml(email)}</strong>,
          enviámos um link para definires uma palavra-passe nova.
        </p>
        ${!isLive() ? `<p class="auth__demo">
          ⚠ Modo demonstração: não há envio real de e-mail.
          ${res.demoExists ? 'A conta existe — usa o botão abaixo para definir a nova palavra-passe.' : 'Não existe conta com este e-mail.'}
        </p>
        ${res.demoExists ? `<button class="btn" id="demoReset">Definir nova palavra-passe (demo)</button>` : ''}` : ''}
        <button class="btn btn--ghost" id="backBtn">Voltar ao início de sessão</button>
      </div>`
    authContent.querySelector('#backBtn').addEventListener('click', () => renderAuthForm('login'))
    const dr = authContent.querySelector('#demoReset')
    if (dr) dr.addEventListener('click', () => renderNewPasswordForm(email))
  } catch (e) {
    err.textContent = e.message || 'Não foi possível enviar. Tenta mais tarde.'
    btn.textContent = 'Enviar link de recuperação'; btn.disabled = false
  }
}

/* ---------- Definir nova palavra-passe ---------- */
function renderNewPasswordForm(demoEmail = null) {
  console.log('[Ascencíon] Link de recuperação detetado — a abrir o ecrã de nova palavra-passe.')
  // abre o modal diretamente (não passa pelo openAuth, que decidiria
  // mostrar a conta por já haver sessão iniciada)
  authOverlay.hidden = false
  document.body.style.overflow = 'hidden' 
  authContent.innerHTML = `
    <p class="eyebrow">Quase lá</p>
    <h3 class="modal__title">Nova palavra-passe</h3>
    <p class="modal__sub">Escolhe uma palavra-passe nova para a tua conta.</p>
    <div class="field">
      <label>Nova palavra-passe</label>
      <input id="n-pass" type="password" placeholder="mín. 6 caracteres" />
      <div class="pwbar"><div class="pwbar__fill" id="pwFill"></div></div>
      <span class="pwbar__label" id="pwLabel"></span>
      <span class="field__err" id="en-pass"></span>
    </div>
    <div class="field">
      <label>Confirmar palavra-passe</label>
      <input id="n-pass2" type="password" placeholder="escreve outra vez" />
      <span class="field__err" id="en-pass2"></span>
    </div>
    <button class="btn modal__pay" id="newPassSubmit">Guardar palavra-passe</button>`

  const p1 = authContent.querySelector('#n-pass')
  p1.addEventListener('input', () => updateStrength(p1.value))
  authContent.querySelectorAll('input').forEach((i) =>
    i.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitNewPassword(demoEmail) })
  )
  authContent.querySelector('#newPassSubmit').addEventListener('click', () => submitNewPassword(demoEmail))
}

// Barra de força da palavra-passe
function updateStrength(v) {
  let score = 0
  if (v.length >= 6) score++
  if (v.length >= 10) score++
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++
  if (/\d/.test(v)) score++
  if (/[^A-Za-z0-9]/.test(v)) score++
  const pct = [0, 20, 40, 60, 80, 100][score]
  const labels = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']
  const colors = ['', '#C8102E', '#C8102E', '#B8863B', '#7A8B3A', '#4A7C2E']
  const fill = authContent.querySelector('#pwFill')
  const label = authContent.querySelector('#pwLabel')
  if (fill) { fill.style.width = pct + '%'; fill.style.background = colors[score] || 'transparent' }
  if (label) { label.textContent = labels[score] || ''; label.style.color = colors[score] || '' }
}

async function submitNewPassword(demoEmail) {
  const p1 = authContent.querySelector('#n-pass').value
  const p2 = authContent.querySelector('#n-pass2').value
  const e1 = authContent.querySelector('#en-pass')
  const e2 = authContent.querySelector('#en-pass2')
  e1.textContent = ''; e2.textContent = ''

  if (p1.length < 6) { e1.textContent = 'Mínimo 6 caracteres'; return }
  if (p1 !== p2) { e2.textContent = 'As palavras-passe não coincidem'; return }

  const btn = authContent.querySelector('#newPassSubmit')
  btn.textContent = 'A guardar…'; btn.disabled = true
  try {
    await Backend.updatePassword(p1, demoEmail)
    // limpa os tokens do URL
    history.replaceState(null, '', window.location.pathname)
    authContent.innerHTML = `
      <div class="modal__state">
        <div class="checkmark">✓</div>
        <h3 class="modal__title">Palavra-passe alterada</h3>
        <p class="modal__sub">Já podes entrar com a nova palavra-passe.</p>
        <button class="btn" id="goLogin">Entrar</button>
      </div>`
    authContent.querySelector('#goLogin').addEventListener('click', () => renderAuthForm('login'))
  } catch (err) {
    e1.textContent = err.message || 'Não foi possível guardar.'
    btn.textContent = 'Guardar palavra-passe'; btn.disabled = false
  }
}

function isLive() { return Backend.isLive() }

async function submitAuth(mode) {
  const isLogin = mode === 'login'
  const g = (id) => authContent.querySelector(id)?.value.trim() || ''
  const setErr = (id, msg) => { const el = authContent.querySelector(id); if (el) el.textContent = msg || '' }
  const name = g('#a-name'), email = g('#a-email'), pass = g('#a-pass')

  let ok = true
  setErr('#ea-name', ''); setErr('#ea-email', ''); setErr('#ea-pass', '')
  if (!isLogin && name.length < 2) { setErr('#ea-name', 'Indica o teu nome'); ok = false }
  if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('#ea-email', 'E-mail inválido'); ok = false }
  if (pass.length < 6) { setErr('#ea-pass', 'Mínimo 6 caracteres'); ok = false }
  if (!ok) return

  const btn = authContent.querySelector('#authSubmit')
  btn.textContent = 'Aguarda…'; btn.disabled = true
  try {
    if (isLogin) {
      currentUser = await Backend.signIn({ email, password: pass })
      onAuthChanged()
      closeAuth()
    } else {
      const res = await Backend.signUp({ name, email, password: pass })
      if (res.needsConfirmation) {
        authContent.innerHTML = `
          <div class="modal__state">
            <div class="checkmark">✓</div>
            <h3 class="modal__title">Confirma o teu e-mail</h3>
            <p class="modal__sub">Enviámos um link de confirmação para <strong>${email}</strong>. Clica nele para ativares a conta.</p>
            <button class="btn" id="okBtn">Entendido</button>
          </div>`
        authContent.querySelector('#okBtn').addEventListener('click', closeAuth)
      } else {
        currentUser = res.user
        onAuthChanged()
        closeAuth()
      }
    }
  } catch (err) {
    setErr(isLogin ? '#ea-email' : '#ea-email', err.message || 'Ocorreu um erro.')
    btn.textContent = isLogin ? 'Entrar' : 'Criar conta'; btn.disabled = false
  }
}

function renderAccount() {
  authContent.innerHTML = `
    <div class="auth__user">
      <div class="auth__avatar">${initials(currentUser.name)}</div>
      <div class="auth__info">
        <span class="auth__name">${currentUser.name}</span>
        <span class="auth__email">${currentUser.email}</span>
      </div>
    </div>
    <p class="modal__sub">Estás pronto para a horda. Participa no fórum e deixa a tua avaliação.</p>
    <button class="btn btn--ghost" id="logoutBtn" style="width:100%">Terminar sessão</button>`
  authContent.querySelector('#logoutBtn').addEventListener('click', async () => {
    await Backend.signOut()
    currentUser = null
    onAuthChanged()
    closeAuth()
  })
}

// Atualiza tudo o que depende do login
function onAuthChanged() {
  const logged = !!currentUser
  const label = logged ? initials(currentUser.name) : 'Entrar'
  accountBtn.textContent = label
  accountBtnMobile.textContent = logged ? `Conta (${currentUser.name})` : 'Entrar'
  accountBtn.classList.toggle('is-logged', logged)

  // portões de "entra para..." abrem/fecham
  syncGate('threadGate', 'threadForm', 'threadUserHint')
  syncGate('reviewGate', 'reviewForm', 'reviewUserHint')
  // recarrega listas (para mostrar caixas de resposta, etc.)
  renderThreads()
  renderReviews()
  // verifica se é admin e mostra/esconde o botão Admin
  if (typeof refreshAdminUI === 'function') refreshAdminUI()
}

function syncGate(gateId, formId, hintId) {
  const gate = document.getElementById(gateId)
  const form = document.getElementById(formId)
  const hint = document.getElementById(hintId)
  if (!gate || !form) return
  if (currentUser) {
    gate.hidden = true; form.hidden = false
    if (hint) hint.innerHTML = `A publicar como <strong>${currentUser.name}</strong>`
  } else {
    gate.hidden = false; form.hidden = true
  }
}

// clicar em qualquer "portão" abre o login
document.querySelectorAll('[data-auth-gate]').forEach((g) =>
  g.addEventListener('click', openAuth)
)

/* ============================================================
   14) FÓRUM (UI)
   ============================================================ */
const threadsList = document.getElementById('threadsList')
const threadSend = document.getElementById('threadSend')
const threadTitle = document.getElementById('threadTitle')
const threadBody = document.getElementById('threadBody')
const threadCount = document.getElementById('threadCount')

threadSend.addEventListener('click', async () => {
  if (!currentUser) return openAuth()
  const title = threadTitle.value.trim()
  const body = threadBody.value.trim()
  if (title.length < 3 || body.length < 3) return
  threadSend.disabled = true; threadSend.textContent = 'A publicar…'
  try {
    await Backend.createThread({ user: currentUser, title, body })
    threadTitle.value = ''; threadBody.value = ''
    await renderThreads()
  } finally {
    threadSend.disabled = false; threadSend.textContent = 'Publicar tópico'
  }
})

async function renderThreads() {
  let threads = []
  try { threads = await Backend.getThreads() } catch (e) { console.warn(e) }
  threadCount.textContent = threads.length

  if (!threads.length) {
    threadsList.innerHTML = `<div class="threads__empty">Ainda não há tópicos. Sê o primeiro a abrir um.</div>`
    return
  }
  threadsList.innerHTML = threads.map((t) => `
    <article class="thread">
      <div class="thread__head">
        <div class="thread__avatar">${initials(t.author_name)}</div>
        <div class="thread__meta">
          ${authorName(t.author_name, t.author_email)}
          <span class="thread__time">${timeAgo(t.created_at)}</span>
        </div>
      </div>
      <h3 class="thread__title">${escapeHtml(t.title)}</h3>
      <p class="thread__body">${escapeHtml(t.body)}</p>
      ${(t.replies && t.replies.length) ? `
        <div class="thread__replies">
          ${t.replies.map((r) => `
            <div class="reply">
              <div class="reply__avatar">${initials(r.author_name)}</div>
              <div class="reply__content">
                ${authorName(r.author_name, r.author_email, 'reply__author')}
                <span class="reply__time">${timeAgo(r.created_at)}</span>
                <div class="reply__body">${escapeHtml(r.body)}</div>
              </div>
            </div>`).join('')}
        </div>` : ''}
      ${currentUser ? `
        <div class="thread__replybar">
          <input class="thread__replyinput" placeholder="Responder…" data-reply="${t.id}" />
          <button class="thread__replybtn" data-replybtn="${t.id}">Enviar</button>
        </div>` : `<p class="thread__locked">Entra para responder a este tópico.</p>`}
    </article>`).join('')

  // ligar botões de resposta
  threadsList.querySelectorAll('[data-replybtn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.replybtn
      const input = threadsList.querySelector(`[data-reply="${id}"]`)
      const body = input.value.trim()
      if (body.length < 1) return
      btn.disabled = true
      try { await Backend.addReply({ threadId: id, user: currentUser, body }); await renderThreads() }
      finally { btn.disabled = false }
    })
  })
}

/* ============================================================
   15) AVALIAÇÕES (UI)
   ============================================================ */
const reviewsList = document.getElementById('reviewsList')
const reviewSend = document.getElementById('reviewSend')
const reviewBody = document.getElementById('reviewBody')
const ratingInput = document.getElementById('ratingInput')
const reviewAvg = document.getElementById('reviewAvg')
const reviewAvgStars = document.getElementById('reviewAvgStars')
const reviewCount = document.getElementById('reviewCount')
let selectedRating = 0

ratingInput.querySelectorAll('button').forEach((b) => {
  b.addEventListener('click', () => {
    selectedRating = +b.dataset.star
    ratingInput.querySelectorAll('button').forEach((x) => x.classList.toggle('on', +x.dataset.star <= selectedRating))
  })
})

reviewSend.addEventListener('click', async () => {
  if (!currentUser) return openAuth()
  const body = reviewBody.value.trim()
  if (!selectedRating) { ratingInput.style.animation = 'pulse 0.4s'; setTimeout(() => ratingInput.style.animation = '', 400); return }
  if (body.length < 3) return
  reviewSend.disabled = true; reviewSend.textContent = 'A publicar…'
  try {
    await Backend.createReview({ user: currentUser, rating: selectedRating, body })
    reviewBody.value = ''; selectedRating = 0
    ratingInput.querySelectorAll('button').forEach((x) => x.classList.remove('on'))
    await renderReviews()
  } finally {
    reviewSend.disabled = false; reviewSend.textContent = 'Publicar avaliação'
  }
})

const starStr = (n, offClass = 'off') => Array.from({ length: 5 }, (_, i) => i < n ? '★' : `<span class="${offClass}">★</span>`).join('')

async function renderReviews() {
  let reviews = []
  try { reviews = await Backend.getReviews() } catch (e) { console.warn(e) }

  if (reviews.length) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    reviewAvg.textContent = avg.toFixed(1)
    reviewAvgStars.innerHTML = starStr(Math.round(avg))
    reviewCount.textContent = `${reviews.length} avaliaç${reviews.length === 1 ? 'ão' : 'ões'}`
  } else {
    reviewAvg.textContent = '—'
    reviewAvgStars.innerHTML = starStr(0)
    reviewCount.textContent = 'Ainda sem avaliações'
  }

  if (!reviews.length) {
    reviewsList.innerHTML = `<div class="reviews__empty">Ainda não há avaliações. Sê o primeiro a dar a tua opinião.</div>`
    return
  }
  reviewsList.innerHTML = reviews.map((r) => `
    <article class="review">
      <div class="review__head">
        <div class="review__avatar">${initials(r.author_name)}</div>
        <div class="review__who">
          ${authorName(r.author_name, r.author_email, 'review__author')}
          <span class="review__time">${timeAgo(r.created_at)}</span>
        </div>
      </div>
      <div class="review__stars">${starStr(r.rating)}</div>
      <p class="review__body">${escapeHtml(r.body)}</p>
    </article>`).join('')
}

/* ------------------------------------------------------------
   Segurança: escapar HTML do que os utilizadores escrevem
   ------------------------------------------------------------ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

/* ------------------------------------------------------------
   Nome do autor com destaque de admin (nome vermelho + selo)
   ------------------------------------------------------------ */
let adminEmailsSet = new Set()

function authorName(name, email, cls = 'thread__author') {
  const isAdmin = email && adminEmailsSet.has(String(email).toLowerCase())
  if (isAdmin) {
    return `<span class="${cls} is-admin">${escapeHtml(name)}<span class="admin-badge">ADMIN</span></span>`
  }
  return `<span class="${cls}">${escapeHtml(name)}</span>`
}

async function refreshAdminEmails() {
  try {
    const admins = await Backend.getAdmins()
    adminEmailsSet = new Set(admins.map((a) => (a.email || '').toLowerCase()))
  } catch { adminEmailsSet = new Set() }
}

/* ============================================================
   16) ARRANQUE: verifica sessão e carrega listas
   ============================================================ */
;(async function boot() {
  await refreshAdminEmails()

  // Se a pessoa chegou pelo link de reposição de palavra-passe,
  // o ecrã de "nova palavra-passe" tem prioridade sobre tudo o resto.
  const isRecovery = Backend.cameFromRecoveryLink()
  Backend.onPasswordRecovery(() => renderNewPasswordForm())

  try { currentUser = await Backend.getCurrentUser() } catch { currentUser = null }
  onAuthChanged()

  // Rede de segurança: se o URL dizia "recovery" mas por alguma razão
  // o ecrã não abriu, forçamo-lo aqui.
  if (isRecovery) {
    setTimeout(() => {
      const jaAberto = !authOverlay.hidden && authContent.querySelector('#n-pass')
      if (!jaAberto) renderNewPasswordForm()
    }, 900)
  }
})()

/* ============================================================
   17) ADMIN + CALENDÁRIO DE UPDATES
   ============================================================ */
const adminBtn = document.getElementById('adminBtn')
const adminBtnMobile = document.getElementById('adminBtnMobile')
const adminOverlay = document.getElementById('adminOverlay')
const adminClose = document.getElementById('adminClose')
const adminUserList = document.getElementById('adminUserList')
const adminUpdateList = document.getElementById('adminUpdateList')
const updatesTimeline = document.getElementById('updatesTimeline')
let userIsAdmin = false
let userIsOwner = false

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

// Mostra/esconde o botão Admin conforme a verificação
async function refreshAdminUI() {
  await refreshAdminEmails() // mantém o set de destaques atualizado
  userIsAdmin = currentUser ? await Backend.isAdmin(currentUser) : false
  userIsOwner = currentUser ? await Backend.isOwner(currentUser) : false
  adminBtn.hidden = !userIsAdmin
  adminBtnMobile.hidden = !userIsAdmin
}

function openAdmin() {
  if (!userIsAdmin) return
  adminOverlay.hidden = false
  document.body.style.overflow = 'hidden'
  loadAdminUsers()
  loadAdminUpdates()
}
function closeAdmin() { adminOverlay.hidden = true; document.body.style.overflow = '' }
adminBtn.addEventListener('click', openAdmin)
adminBtnMobile.addEventListener('click', openAdmin)
adminClose.addEventListener('click', closeAdmin)
adminOverlay.addEventListener('click', (e) => { if (e.target === adminOverlay) closeAdmin() })
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !adminOverlay.hidden) closeAdmin() })

// Tabs do painel admin
document.querySelectorAll('.admin__tab').forEach((t) =>
  t.addEventListener('click', () => {
    document.querySelectorAll('.admin__tab').forEach((x) => x.classList.remove('is-active'))
    t.classList.add('is-active')
    const tab = t.dataset.atab
    document.getElementById('adminUsers').hidden = tab !== 'users'
    document.getElementById('adminCalendar').hidden = tab !== 'calendar'
    document.getElementById('adminMod').hidden = tab !== 'mod'
    document.getElementById('adminOrders').hidden = tab !== 'orders'
    if (tab === 'mod') loadModeration()
    if (tab === 'orders') loadOrders()
  })
)

// ---- Utilizadores ----
async function loadAdminUsers() {
  adminUserList.innerHTML = '<p class="admin__hint">A carregar…</p>'
  let users = []
  try { users = await Backend.adminListUsers(currentUser) }
  catch (e) { adminUserList.innerHTML = `<p class="admin__hint">Erro: ${escapeHtml(e.message)}</p>`; return }

  if (!users.length) { adminUserList.innerHTML = '<p class="admin__hint">Sem utilizadores.</p>'; return }
  const adminSet = adminEmailsSet // já atualizado no refreshAdminUI
  adminUserList.innerHTML = users.map((u) => {
    const email = (u.email || '').toLowerCase()
    const targetIsAdmin = adminSet.has(email)
    const isMe = u.email === currentUser.email
    // botão de cargo (só o dono vê, e não sobre si próprio)
    let roleBtn = ''
    if (userIsOwner && !isMe) {
      roleBtn = targetIsAdmin
        ? `<button class="userrow__role is-revoke" data-revoke="${escapeHtml(u.email)}">Remover admin</button>`
        : `<button class="userrow__role" data-grant="${escapeHtml(u.email)}">Tornar admin</button>`
    }
    const delBtn = isMe
      ? '<span class="userrow__me">és tu</span>'
      : `<button class="userrow__del" data-del-user="${u.id}">Remover</button>`
    return `
    <div class="userrow">
      <div class="userrow__avatar">${initials(u.name || u.email)}</div>
      <div class="userrow__info">
        <div class="userrow__name">${escapeHtml(u.name || '(sem nome)')}${targetIsAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}</div>
        <div class="userrow__email">${escapeHtml(u.email)}</div>
      </div>
      <div class="userrow__actions">${roleBtn}${delBtn}</div>
    </div>`
  }).join('')

  // remover conta
  adminUserList.querySelectorAll('[data-del-user]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('Remover esta conta permanentemente?')) return
      btn.disabled = true; btn.textContent = '…'
      try { await Backend.adminDeleteUser(currentUser, btn.dataset.delUser); await loadAdminUsers() }
      catch (e) { alert('Erro: ' + e.message); btn.disabled = false; btn.textContent = 'Remover' }
    })
  )
  // tornar admin
  adminUserList.querySelectorAll('[data-grant]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = '…'
      try { await Backend.grantAdmin(currentUser, btn.dataset.grant); await refreshAdminEmails(); await loadAdminUsers() }
      catch (e) { alert('Erro: ' + e.message); btn.disabled = false }
    })
  )
  // remover admin
  adminUserList.querySelectorAll('[data-revoke]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('Remover o cargo de admin a esta conta?')) return
      btn.disabled = true; btn.textContent = '…'
      try { await Backend.revokeAdmin(currentUser, btn.dataset.revoke); await refreshAdminEmails(); await loadAdminUsers() }
      catch (e) { alert('Erro: ' + e.message); btn.disabled = false }
    })
  )
}

// ---- Calendário (lado admin) ----
const upDate = document.getElementById('upDate')
const upTag = document.getElementById('upTag')
const upTitle = document.getElementById('upTitle')
const upBody = document.getElementById('upBody')
const upAdd = document.getElementById('upAdd')

upAdd.addEventListener('click', async () => {
  const date = upDate.value
  const title = upTitle.value.trim()
  const body = upBody.value.trim()
  const tag = upTag.value
  if (!date || title.length < 3) { alert('Preenche pelo menos a data e o título.'); return }
  upAdd.disabled = true; upAdd.textContent = 'A adicionar…'
  try {
    await Backend.createUpdate(currentUser, { date, title, body, tag })
    upTitle.value = ''; upBody.value = ''; upDate.value = ''
    await loadAdminUpdates()
    await renderUpdates()
  } catch (e) { alert('Erro: ' + e.message) }
  finally { upAdd.disabled = false; upAdd.textContent = 'Adicionar ao calendário' }
})

async function loadAdminUpdates() {
  let updates = []
  try { updates = await Backend.getUpdates() } catch { updates = [] }
  if (!updates.length) { adminUpdateList.innerHTML = '<p class="admin__hint">Sem updates agendados.</p>'; return }
  adminUpdateList.innerHTML = updates.map((u) => `
    <div class="upadmin">
      <span class="upadmin__date">${fmtDateShort(u.date)}</span>
      <div class="upadmin__info">
        <div class="upadmin__title">${escapeHtml(u.title)}</div>
        <div class="upadmin__tag">${escapeHtml(u.tag || '')}</div>
      </div>
      <button class="upadmin__del" data-del-update="${u.id}" aria-label="Remover">✕</button>
    </div>`).join('')
  adminUpdateList.querySelectorAll('[data-del-update]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('Remover este update do calendário?')) return
      try { await Backend.deleteUpdate(currentUser, btn.dataset.delUpdate); await loadAdminUpdates(); await renderUpdates() }
      catch (e) { alert('Erro: ' + e.message) }
    })
  )
}

// ---- Calendário (público) ----
function fmtDateShort(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`
}
function daysUntil(iso) {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

async function renderUpdates() {
  let updates = []
  try { updates = await Backend.getUpdates() } catch (e) { console.warn(e) }

  if (!updates.length) {
    updatesTimeline.innerHTML = `<div class="updates__empty">Ainda não há atualizações agendadas. Volta em breve.</div>`
    return
  }
  updatesTimeline.innerHTML = updates.map((u) => {
    const d = new Date(u.date + 'T00:00:00')
    const dias = daysUntil(u.date)
    const past = dias < 0
    let countdown = ''
    if (dias > 0) countdown = `Faltam ${dias} dia${dias === 1 ? '' : 's'}`
    else if (dias === 0) countdown = 'É hoje!'
    else countdown = 'Já lançado'
    return `
      <div class="uprow ${past ? 'uprow--past' : ''}">
        <div class="uprow__date">
          <div class="uprow__day">${String(d.getDate()).padStart(2, '0')}</div>
          <div class="uprow__month">${MESES[d.getMonth()]}</div>
          <div class="uprow__year">${d.getFullYear()}</div>
        </div>
        <div class="uprow__card">
          ${u.tag ? `<span class="uprow__tag">${escapeHtml(u.tag)}</span>` : ''}
          <h3 class="uprow__title">${escapeHtml(u.title)}</h3>
          ${u.body ? `<p class="uprow__body">${escapeHtml(u.body)}</p>` : ''}
          <div class="uprow__countdown">${countdown}</div>
        </div>
      </div>`
  }).join('')
}

// Carrega o calendário público no arranque
renderUpdates()

/* ============================================================
   18) ARENA 3D — modelo FBX com texturas aplicadas à mão
   ------------------------------------------------------------
   O FBX aponta para caminhos do Unity que não existem aqui,
   por isso carregamos as texturas manualmente e ligamo-las a
   cada material pelo nome. O mapa está em TEXTURE_MAP.
   ============================================================ */

// Correspondência: nome do material no FBX -> nome base da textura
const TEXTURE_MAP = {
  'ArenaMaterial':    'Arena',
  'PillarsMaterial':  'Pillars',
  'FlagPoleMaterial': 'FlagPole',
  'Flag':             'Flags',
  'MechanismMaterial':'Mechanism',
  'ArenaGate':        'GateArena',
  'WoodSpike':        'WoodSpikes',
  // 'Lit' não tem textura — fica com cor sólida (ver abaixo)
}
const TEX_DIR = 'models/textures/'

const arenaViewer = document.getElementById('arenaViewer')
const arenaLoading = document.getElementById('arenaLoading')
const arenaProgress = document.getElementById('arenaProgress')

let aRenderer, aScene, aCamera, aControls, aModel
let arenaStarted = false

function initArena() {
  if (arenaStarted) return
  arenaStarted = true

  const w = arenaViewer.clientWidth
  const h = arenaViewer.clientHeight

  aRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  aRenderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  aRenderer.setSize(w, h)
  aRenderer.shadowMap.enabled = true
  aRenderer.shadowMap.type = THREE.PCFSoftShadowMap
  arenaViewer.appendChild(aRenderer.domElement)

  aScene = new THREE.Scene()

  aCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
  aCamera.position.set(4.5, 3.2, 4.5)

  // Luzes: quente por cima, vermelho de contorno (estilo do site)
  aScene.add(new THREE.AmbientLight(0xffffff, 0.85))
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.5)
  sun.position.set(6, 10, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 40
  sun.shadow.camera.left = -8; sun.shadow.camera.right = 8
  sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8
  aScene.add(sun)
  const rim = new THREE.DirectionalLight(0xC8102E, 0.5)
  rim.position.set(-6, 3, -5)
  aScene.add(rim)
  aScene.add(new THREE.HemisphereLight(0xF7F4EF, 0x8A7A6A, 0.5))

  aControls = new OrbitControls(aCamera, aRenderer.domElement)
  aControls.enableDamping = true
  aControls.dampingFactor = 0.06
  aControls.autoRotate = true
  aControls.autoRotateSpeed = 0.7
  aControls.minDistance = 2
  aControls.maxDistance = 14
  aControls.maxPolarAngle = Math.PI / 2.05 // não deixa ir por baixo do chão
  aControls.target.set(0, 0.3, 0)

  loadArenaModel()
  animateArena()
  addEventListener('resize', resizeArena)
}

function resizeArena() {
  if (!aRenderer) return
  const w = arenaViewer.clientWidth, h = arenaViewer.clientHeight
  aRenderer.setSize(w, h)
  aCamera.aspect = w / h
  aCamera.updateProjectionMatrix()
}

function animateArena() {
  requestAnimationFrame(animateArena)
  if (aControls) aControls.update()
  if (aRenderer) aRenderer.render(aScene, aCamera)
}

function loadArenaModel() {
  const texLoader = new THREE.TextureLoader()
  const cache = {}

  // carrega (com cache) uma textura pelo nome base e sufixo
  function tex(base, suffix) {
    const key = base + suffix
    if (cache[key]) return cache[key]
    const t = texLoader.load(`${TEX_DIR}${base}-${suffix}.jpg`)
    t.colorSpace = suffix === 'Albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.flipY = false // FBX usa UVs ao contrário
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    cache[key] = t
    return t
  }

  const loader = new FBXLoader()
  loader.load(
    'models/arena.fbx',
    (obj) => {
      aModel = obj

      // Aplicar texturas a cada material pelo nome
      obj.traverse((child) => {
        if (!child.isMesh) return
        child.castShadow = true
        child.receiveShadow = true

        const mats = Array.isArray(child.material) ? child.material : [child.material]
        const newMats = mats.map((m) => {
          const base = TEXTURE_MAP[m.name]
          if (!base) {
            // material sem textura (ex: 'Lit') -> cor sólida discreta
            return new THREE.MeshStandardMaterial({
              color: 0xC9BFB2, roughness: 0.9, metalness: 0.0,
            })
          }
          return new THREE.MeshStandardMaterial({
            map: tex(base, 'Albedo'),
            normalMap: tex(base, 'NM'),
            aoMap: tex(base, 'AO'),
            aoMapIntensity: 0.8,
            roughness: 0.85,
            metalness: 0.05,
          })
        })
        child.material = Array.isArray(child.material) ? newMats : newMats[0]

        // aoMap precisa de um segundo canal de UV; reutilizamos o primeiro
        const g = child.geometry
        if (g && g.attributes.uv && !g.attributes.uv1) {
          g.setAttribute('uv1', g.attributes.uv)
        }
      })

      // Escalar e centrar automaticamente
      const box = new THREE.Box3().setFromObject(obj)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      obj.scale.setScalar(5 / maxDim)

      const box2 = new THREE.Box3().setFromObject(obj)
      const c2 = box2.getCenter(new THREE.Vector3())
      const min2 = box2.min
      obj.position.x -= c2.x
      obj.position.z -= c2.z
      obj.position.y -= min2.y // assenta no "chão"

      aScene.add(obj)

      // sombra suave no chão
      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.ShadowMaterial({ opacity: 0.18 })
      )
      shadowPlane.rotation.x = -Math.PI / 2
      shadowPlane.position.y = 0.001
      shadowPlane.receiveShadow = true
      aScene.add(shadowPlane)

      arenaLoading.classList.add('is-done')
    },
    (xhr) => {
      if (xhr.total) {
        const pct = Math.round((xhr.loaded / xhr.total) * 100)
        arenaProgress.textContent = `A carregar a arena… ${pct}%`
      }
    },
    (err) => {
      console.error('Erro ao carregar a arena:', err)
      arenaProgress.textContent = 'Não foi possível carregar a arena.'
    }
  )
}

// ---- Controlos ----
document.getElementById('arenaReset').addEventListener('click', () => {
  if (!aCamera) return
  aCamera.position.set(4.5, 3.2, 4.5)
  aControls.target.set(0, 0.3, 0)
  aControls.update()
})
document.getElementById('arenaTop').addEventListener('click', () => {
  if (!aCamera) return
  aCamera.position.set(0, 7.5, 0.01)
  aControls.target.set(0, 0, 0)
  aControls.update()
})
const arenaSpin = document.getElementById('arenaSpin')
arenaSpin.addEventListener('click', () => {
  if (!aControls) return
  aControls.autoRotate = !aControls.autoRotate
  arenaSpin.textContent = aControls.autoRotate ? '⏸ Parar rotação' : '▶ Rodar'
})

// Só carrega o modelo quando a secção entra na vista (poupa dados)
const arenaObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) { initArena(); arenaObserver.disconnect() }
}, { threshold: 0.1 })
arenaObserver.observe(document.getElementById('arena'))

/* ============================================================
   19) TRAILER (YouTube)
   ------------------------------------------------------------
   O iframe do YouTube só é criado ao clicar na capa. Assim a
   página abre depressa e não carrega nada do YouTube antes.
   Para trocar de vídeo, muda o YT_ID abaixo.
   ============================================================ */
const YT_ID = 'RgsRDcudSw4'

const trailerCover = document.getElementById('trailerCover')
const trailerPlayer = document.getElementById('trailerPlayer')

if (trailerCover && trailerPlayer) {
  trailerCover.addEventListener('click', () => {
    // parâmetros: autoplay, sem vídeos de outros canais no fim,
    // interface mínima, sem anotações
    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',            // sugestões só do mesmo canal
      modestbranding: '1', // menos logo do YouTube
      playsinline: '1',
      color: 'white',
    })
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.youtube-nocookie.com/embed/${YT_ID}?${params}`
    iframe.title = 'Trailer de Ascencíon'
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    iframe.allowFullscreen = true
    iframe.loading = 'lazy'
    trailerPlayer.appendChild(iframe)
    trailerCover.classList.add('is-hidden')
  })
}

/* ============================================================
   20) MODERAÇÃO (painel admin)
   ============================================================ */
const adminModList = document.getElementById('adminModList')
let modTab = 'threads'

document.querySelectorAll('.admin__modtab').forEach((t) =>
  t.addEventListener('click', () => {
    document.querySelectorAll('.admin__modtab').forEach((x) => x.classList.remove('is-active'))
    t.classList.add('is-active')
    modTab = t.dataset.mtab
    loadModeration()
  })
)

async function loadModeration() {
  if (!adminModList) return
  adminModList.innerHTML = '<p class="admin__hint">A carregar…</p>'

  if (modTab === 'threads') {
    let threads = []
    try { threads = await Backend.getThreads() } catch (e) { adminModList.innerHTML = `<p class="admin__hint">Erro: ${escapeHtml(e.message)}</p>`; return }
    if (!threads.length) { adminModList.innerHTML = '<p class="admin__hint">Sem tópicos.</p>'; return }

    adminModList.innerHTML = threads.map((t) => `
      <div class="moditem">
        <div class="moditem__head">
          <span class="moditem__author">${escapeHtml(t.author_name)}</span>
          <span class="moditem__time">${timeAgo(t.created_at)}</span>
          <button class="moditem__del" data-mod-thread="${t.id}">Apagar tópico</button>
        </div>
        <h4 class="moditem__title">${escapeHtml(t.title)}</h4>
        <p class="moditem__body">${escapeHtml(t.body)}</p>
        ${(t.replies && t.replies.length) ? `
          <div class="moditem__replies">
            ${t.replies.map((r) => `
              <div class="modreply">
                <span class="moditem__author">${escapeHtml(r.author_name)}:</span>
                <span class="modreply__body">${escapeHtml(r.body)}</span>
                <button class="modreply__del" data-mod-reply="${r.id}" data-mod-thread-id="${t.id}" title="Apagar resposta">✕</button>
              </div>`).join('')}
          </div>` : ''}
      </div>`).join('')

    adminModList.querySelectorAll('[data-mod-thread]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Apagar este tópico e todas as suas respostas?')) return
        btn.disabled = true; btn.textContent = '…'
        try { await Backend.deleteThread(currentUser, btn.dataset.modThread); await loadModeration(); await renderThreads() }
        catch (e) { alert('Erro: ' + e.message); btn.disabled = false; btn.textContent = 'Apagar tópico' }
      })
    )
    adminModList.querySelectorAll('[data-mod-reply]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Apagar esta resposta?')) return
        try {
          await Backend.deleteReply(currentUser, btn.dataset.modThreadId, btn.dataset.modReply)
          await loadModeration(); await renderThreads()
        } catch (e) { alert('Erro: ' + e.message) }
      })
    )

  } else {
    let reviews = []
    try { reviews = await Backend.getReviews() } catch (e) { adminModList.innerHTML = `<p class="admin__hint">Erro: ${escapeHtml(e.message)}</p>`; return }
    if (!reviews.length) { adminModList.innerHTML = '<p class="admin__hint">Sem avaliações.</p>'; return }

    adminModList.innerHTML = reviews.map((r) => `
      <div class="moditem">
        <div class="moditem__head">
          <span class="moditem__author">${escapeHtml(r.author_name)}</span>
          <span class="moditem__time">${timeAgo(r.created_at)}</span>
          <button class="moditem__del" data-mod-review="${r.id}">Apagar</button>
        </div>
        <div class="moditem__stars">${starStr(r.rating)}</div>
        <p class="moditem__body">${escapeHtml(r.body)}</p>
      </div>`).join('')

    adminModList.querySelectorAll('[data-mod-review]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Apagar esta avaliação?')) return
        btn.disabled = true; btn.textContent = '…'
        try { await Backend.deleteReview(currentUser, btn.dataset.modReview); await loadModeration(); await renderReviews() }
        catch (e) { alert('Erro: ' + e.message); btn.disabled = false; btn.textContent = 'Apagar' }
      })
    )
  }
}

/* ============================================================
   21) LOG DE COMPRAS (painel admin)
   ============================================================ */
const adminOrderList = document.getElementById('adminOrderList')
const ordStats = document.getElementById('ordStats')

// ícone conforme o método de pagamento
function payIcon(method) {
  const m = (method || '').toLowerCase()
  if (m.includes('prenda')) return '🎁'
  if (m.includes('paypal')) return '🅿️'
  if (m.includes('apple')) return ''
  if (m.includes('google')) return 'G'
  return '💳'
}

function fmtDateTime(v) {
  const d = typeof v === 'number' ? new Date(v) : new Date(v)
  if (isNaN(d)) return '—'
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function loadOrders() {
  if (!adminOrderList) return
  adminOrderList.innerHTML = '<p class="admin__hint">A carregar…</p>'
  ordStats.innerHTML = ''

  let orders = []
  try { orders = await Backend.getOrders() }
  catch (e) { adminOrderList.innerHTML = `<p class="admin__hint">Erro: ${escapeHtml(e.message)}</p>`; return }

  if (!orders.length) {
    adminOrderList.innerHTML = '<p class="admin__hint">Ainda não há compras registadas.</p>'
    return
  }

  // Resumo
  const total = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0)
  const gifts = orders.filter((o) => o.is_gift).length
  ordStats.innerHTML = `
    <div class="ordstat"><span class="ordstat__n">${orders.length}</span><span class="ordstat__l">Compras</span></div>
    <div class="ordstat"><span class="ordstat__n">€ ${fmt(total)}</span><span class="ordstat__l">Receita</span></div>
    <div class="ordstat"><span class="ordstat__n">${gifts}</span><span class="ordstat__l">Prendas</span></div>`

  adminOrderList.innerHTML = orders.map((o) => `
    <div class="ordrow ${o.is_gift ? 'ordrow--gift' : ''}">
      <div class="ordrow__icon">${payIcon(o.payment_method)}</div>
      <div class="ordrow__main">
        <div class="ordrow__top">
          <span class="ordrow__who">${escapeHtml(o.customer_name || '—')}</span>
          ${o.is_gift ? '<span class="ordrow__tag">Prenda</span>' : ''}
        </div>
        <div class="ordrow__email">${escapeHtml(o.customer_email || '')}</div>
        ${o.is_gift && o.gift_from ? `<div class="ordrow__from">Oferecida por: ${escapeHtml(o.gift_from)}</div>` : ''}
        <div class="ordrow__meta">
          <span>${escapeHtml(o.payment_method || '—')}${o.card_last4 ? ` ••••${escapeHtml(o.card_last4)}` : ''}</span>
          <span>·</span>
          <span>${fmtDateTime(o.created_at)}</span>
        </div>
        ${o.activation_key ? `<code class="ordrow__key">${escapeHtml(o.activation_key)}</code>` : ''}
      </div>
      <div class="ordrow__amount">€ ${fmt(Number(o.amount) || 0)}</div>
    </div>`).join('')
}

/* ============================================================
   22) SUPORTE — Chatbot guiado + FAQ
   ------------------------------------------------------------
   O bot segue uma árvore de conversa. Para adicionar/mudar
   respostas, edita CHAT_TREE abaixo:
     - msg:     o que o bot responde (array = várias bolhas)
     - options: botões que aparecem a seguir [{ label, goto }]
   ============================================================ */

const CHAT_TREE = {
  start: {
    msg: [
      'Olá! Sou o assistente do Ascencíon. 👋',
      'Em que posso ajudar?',
    ],
    options: [
      { label: '🎮 Sobre o jogo', goto: 'jogo' },
      { label: '💳 Pagamentos', goto: 'pagamento' },
      { label: '📦 Comprar e receber', goto: 'compra' },
      { label: '🔧 Problemas técnicos', goto: 'tecnico' },
    ],
  },

  /* ---------- SOBRE O JOGO ---------- */
  jogo: {
    msg: 'O Ascencíon é um jogo de sobrevivência: aguentas ondas infinitas de esqueletos numa arena, e a dificuldade sobe sem teto. O que queres saber?',
    options: [
      { label: 'Que conteúdo tem?', goto: 'jogo_conteudo' },
      { label: 'Requisitos do PC', goto: 'jogo_requisitos' },
      { label: 'Há multijogador?', goto: 'jogo_multi' },
      { label: '← Voltar', goto: 'start' },
    ],
  },
  jogo_conteudo: {
    msg: [
      'O jogo inclui:',
      '• 2 armas — a Claymore do Ocaso e o Machado de duas mãos\n• O Crusader Tank, um chefe blindado que aparece a cada 5 ondas\n• 1 arena com ondas infinitas de esqueletos\n• Todas as atualizações futuras incluídas',
      'Sem microtransações. Pagas uma vez e tens tudo. 🗡️',
    ],
    options: [
      { label: 'Ver a arena em 3D', link: '#arena' },
      { label: 'Ver personagens e armas', link: '#galeria' },
      { label: '← Voltar', goto: 'jogo' },
    ],
  },
  jogo_requisitos: {
    msg: [
      'Requisitos:',
      '• Sistema: Windows 10 ou 11\n• Espaço: ~250 MB (instalado)\n• Idiomas: Português e Inglês\n• Modo: Um jogador',
      'É um jogo leve — corre bem na maioria dos PCs.',
    ],
    options: [
      { label: 'Funciona em Mac/Linux?', goto: 'jogo_mac' },
      { label: '← Voltar', goto: 'jogo' },
    ],
  },
  jogo_mac: {
    msg: 'Neste momento só há versão para Windows. Não temos data para Mac ou Linux — se isso mudar, anunciamos na secção de Updates. 📅',
    options: [
      { label: 'Ver o calendário de updates', link: '#updates' },
      { label: '← Voltar', goto: 'jogo' },
    ],
  },
  jogo_multi: {
    msg: 'Não — o Ascencíon é um jogo para um jogador. É só tu contra a horda. 💀',
    options: [
      { label: 'E há tabelas de recordes?', goto: 'jogo_records' },
      { label: '← Voltar', goto: 'jogo' },
    ],
  },
  jogo_records: {
    msg: 'Por agora não há tabela de recordes no jogo. Mas podes partilhar a tua melhor onda no fórum da comunidade — há por lá gente a competir. 🏆',
    options: [
      { label: 'Ir ao fórum', link: '#comunidade' },
      { label: '← Voltar', goto: 'jogo' },
    ],
  },

  /* ---------- PAGAMENTOS ---------- */
  pagamento: {
    msg: 'Sobre pagamentos — o que precisas de saber?',
    options: [
      { label: 'Que métodos aceitam?', goto: 'pag_metodos' },
      { label: 'É seguro?', goto: 'pag_seguro' },
      { label: 'Quanto custa?', goto: 'pag_preco' },
      { label: 'Posso pedir reembolso?', goto: 'pag_reembolso' },
      { label: '← Voltar', goto: 'start' },
    ],
  },
  pag_metodos: {
    msg: [
      'Aceitamos:',
      '💳 Cartão (Visa, Mastercard, American Express)\n🅿️ PayPal\n Apple Pay\nG Google Pay',
      'Escolhes o método na janela de compra.',
    ],
    options: [
      { label: 'Comprar agora', action: 'buy' },
      { label: '← Voltar', goto: 'pagamento' },
    ],
  },
  pag_seguro: {
    msg: [
      'Sim. A ligação é encriptada e **nunca guardamos o número completo do teu cartão** — só os últimos 4 dígitos, para poderes identificar a compra no recibo.',
      'O CVV e a validade não são guardados em lado nenhum. É assim que os sistemas de pagamento sérios funcionam. 🔒',
    ],
    options: [
      { label: 'Que métodos aceitam?', goto: 'pag_metodos' },
      { label: '← Voltar', goto: 'pagamento' },
    ],
  },
  pag_preco: {
    msg: [
      'O jogo custa **5,00 €**.',
      'É pagamento único: sem subscrições, sem extras, sem microtransações.',
    ],
    options: [
      { label: 'Comprar agora', action: 'buy' },
      { label: '← Voltar', goto: 'pagamento' },
    ],
  },
  pag_reembolso: {
    msg: 'Se o jogo não correr no teu PC ou houver um problema com a compra, fala connosco no fórum e resolvemos caso a caso. Como é um produto digital com ativação imediata, pedimos que confirmes os requisitos antes de comprar. 📋',
    options: [
      { label: 'Ver requisitos', goto: 'jogo_requisitos' },
      { label: 'Ir ao fórum', link: '#comunidade' },
      { label: '← Voltar', goto: 'pagamento' },
    ],
  },

  /* ---------- COMPRA E ENTREGA ---------- */
  compra: {
    msg: 'Sobre a compra e a entrega do jogo — escolhe:',
    options: [
      { label: 'Como recebo o jogo?', goto: 'compra_receber' },
      { label: 'Preciso de conta?', goto: 'compra_conta' },
      { label: 'Oferecer a alguém', goto: 'compra_prenda' },
      { label: 'Perdi a minha chave', goto: 'compra_chave' },
      { label: '← Voltar', goto: 'start' },
    ],
  },
  compra_receber: {
    msg: [
      'Assim que o pagamento é confirmado, recebes logo:',
      '🔑 Uma **chave de ativação** única (aparece no ecrã e vai por e-mail)\n⬇️ Um **link de download** do jogo',
      'É instantâneo — não há espera.',
    ],
    options: [
      { label: 'Comprar agora', action: 'buy' },
      { label: '← Voltar', goto: 'compra' },
    ],
  },
  compra_conta: {
    msg: 'Para comprar, não precisas de conta — basta o e-mail para onde enviamos a chave. Mas com conta podes participar no fórum, deixar avaliações e ter tudo num só sítio. 👤',
    options: [
      { label: 'Criar conta', action: 'auth' },
      { label: '← Voltar', goto: 'compra' },
    ],
  },
  compra_prenda: {
    msg: [
      'Podes! Na janela de compra, ativa a opção **"Isto é uma prenda para outra pessoa"** 🎁',
      'Depois escreves o e-mail de quem recebe, e a chave vai direta para essa pessoa. Quando ela a ativar, o jogo fica na conta dela.',
    ],
    options: [
      { label: 'Oferecer agora', action: 'buy' },
      { label: '← Voltar', goto: 'compra' },
    ],
  },
  compra_chave: {
    msg: 'A chave é enviada para o e-mail que usaste na compra — começa por procurar aí (vê também o spam). Se mesmo assim não a encontrares, escreve no fórum com o número do pedido e ajudamos. 🔍',
    options: [
      { label: 'Ir ao fórum', link: '#comunidade' },
      { label: '← Voltar', goto: 'compra' },
    ],
  },

  /* ---------- TÉCNICO ---------- */
  tecnico: {
    msg: 'Problemas técnicos — o que se passa?',
    options: [
      { label: 'O jogo não abre', goto: 'tec_naoabre' },
      { label: 'A chave não funciona', goto: 'tec_chave' },
      { label: 'Não consigo entrar na conta', goto: 'tec_login' },
      { label: '← Voltar', goto: 'start' },
    ],
  },
  tec_naoabre: {
    msg: [
      'Tenta por esta ordem:',
      '1. Confirma que tens Windows 10 ou 11\n2. Atualiza os drivers da placa gráfica\n3. Clica com o botão direito no jogo → "Executar como administrador"\n4. Verifica se o antivírus não o está a bloquear',
      'Se nada disto resolver, descreve o problema no fórum — a comunidade e nós ajudamos. 🔧',
    ],
    options: [
      { label: 'Ir ao fórum', link: '#comunidade' },
      { label: '← Voltar', goto: 'tecnico' },
    ],
  },
  tec_chave: {
    msg: 'Confirma que copiaste a chave inteira, no formato ASC-XXXX-XXXX-XXXX, sem espaços a mais. As chaves só podem ser usadas uma vez — se já a ativaste antes, o jogo já está associado a essa conta. ⚠️',
    options: [
      { label: 'Perdi a minha chave', goto: 'compra_chave' },
      { label: 'Ir ao fórum', link: '#comunidade' },
      { label: '← Voltar', goto: 'tecnico' },
    ],
  },
  tec_login: {
    msg: [
      'Duas coisas a verificar:',
      '• Se criaste conta agora, confirma o e-mail primeiro (procura o link na tua caixa de entrada)\n• Se te esqueceste da palavra-passe, usa o "Esqueci-me" na janela de início de sessão',
    ],
    options: [
      { label: 'Abrir início de sessão', action: 'auth' },
      { label: '← Voltar', goto: 'tecnico' },
    ],
  },
}

const chatBody = document.getElementById('chatBody')
const chatOptions = document.getElementById('chatOptions')
const chatResetBtn = document.getElementById('chatReset')

function chatBubble(text, who = 'bot') {
  const b = document.createElement('div')
  b.className = `bubble bubble--${who}`
  // permite **negrito** e quebras de linha
  b.innerHTML = escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')
  chatBody.appendChild(b)
  chatBody.scrollTop = chatBody.scrollHeight
  return b
}

function chatTyping() {
  const t = document.createElement('div')
  t.className = 'bubble bubble--bot bubble--typing'
  t.innerHTML = '<span></span><span></span><span></span>'
  chatBody.appendChild(t)
  chatBody.scrollTop = chatBody.scrollHeight
  return t
}

async function chatGo(nodeId, userLabel = null) {
  const node = CHAT_TREE[nodeId]
  if (!node) return

  // mostra o que o utilizador escolheu
  if (userLabel) chatBubble(userLabel.replace(/^[←]\s*/, ''), 'user')

  chatOptions.innerHTML = ''
  const msgs = Array.isArray(node.msg) ? node.msg : [node.msg]

  for (const m of msgs) {
    const typing = chatTyping()
    await new Promise((r) => setTimeout(r, 500 + Math.min(m.length * 8, 700)))
    typing.remove()
    chatBubble(m, 'bot')
  }

  // botões de resposta
  ;(node.options || []).forEach((o) => {
    const btn = document.createElement('button')
    btn.className = 'chat__opt' + (o.label.startsWith('←') ? ' chat__opt--back' : '')
    btn.textContent = o.label
    btn.addEventListener('click', () => {
      if (o.action === 'buy') { chatBubble(o.label, 'user'); openCheckout(); return }
      if (o.action === 'auth') { chatBubble(o.label, 'user'); openAuth(); return }
      if (o.link) { chatBubble(o.label, 'user'); document.querySelector(o.link)?.scrollIntoView({ behavior: 'smooth' }); return }
      chatGo(o.goto, o.label)
    })
    chatOptions.appendChild(btn)
  })
  chatBody.scrollTop = chatBody.scrollHeight
}

if (chatResetBtn) {
  chatResetBtn.addEventListener('click', () => {
    chatBody.innerHTML = ''
    chatGo('start')
  })
}

// arranca o chat quando a secção entra na vista
const supportObs = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    chatGo('start')
    supportObs.disconnect()
  }
}, { threshold: 0.2 })
const supportEl = document.getElementById('suporte')
if (supportEl) supportObs.observe(supportEl)

/* ---------------- FAQ ---------------- */
const FAQ = [
  {
    q: 'Quanto custa o jogo?',
    a: 'Custa 5,00 €. É pagamento único — sem subscrições, sem microtransações, sem extras.',
  },
  {
    q: 'Que métodos de pagamento aceitam?',
    a: 'Cartão (Visa, Mastercard, American Express), PayPal, Apple Pay e Google Pay. Escolhes o método na janela de compra.',
  },
  {
    q: 'Como recebo o jogo depois de comprar?',
    a: 'Imediatamente após o pagamento recebes uma chave de ativação única e o link de download. Aparecem no ecrã e vão também para o teu e-mail.',
  },
  {
    q: 'Os meus dados de cartão ficam guardados?',
    a: 'Não. Guardamos apenas os últimos 4 dígitos, para poderes identificar a compra. O número completo, a validade e o CVV nunca são guardados.',
  },
  {
    q: 'Preciso de criar conta para comprar?',
    a: 'Não. Para comprar basta o e-mail. A conta serve para participares no fórum e deixares avaliações.',
  },
  {
    q: 'Posso oferecer o jogo a outra pessoa?',
    a: 'Sim. Na janela de compra ativa a opção "Isto é uma prenda" e indica o e-mail de quem recebe. A chave vai direta para essa pessoa.',
  },
  {
    q: 'Que conteúdo tem o jogo?',
    a: '2 armas (Claymore e Machado de duas mãos), o chefe Crusader Tank a cada 5 ondas, e uma arena com ondas infinitas de esqueletos. Todas as atualizações futuras estão incluídas.',
  },
  {
    q: 'Quais são os requisitos?',
    a: 'Windows 10 ou 11 e cerca de 250 MB de espaço livre. O download tem ~107 MB. É um jogo leve e corre bem na maioria dos PCs. Não há versão para Mac ou Linux de momento.',
  },
  {
    q: 'Tem multijogador?',
    a: 'Não. O Ascencíon é uma experiência para um jogador — só tu contra a horda.',
  },
  {
    q: 'Esqueci-me da palavra-passe. E agora?',
    a: 'Na janela de início de sessão clica em "Esqueci-me", escreve o teu e-mail e recebes um link para definires uma nova palavra-passe.',
  },
]

const faqList = document.getElementById('faqList')
if (faqList) {
  faqList.innerHTML = FAQ.map((f, i) => `
    <details class="faqitem reveal" style="--d:${Math.min(i, 5) * 0.05}s">
      <summary class="faqitem__q">
        <span>${escapeHtml(f.q)}</span>
        <span class="faqitem__ico" aria-hidden="true">+</span>
      </summary>
      <div class="faqitem__a">${escapeHtml(f.a)}</div>
    </details>`).join('')
  document.querySelectorAll('#faqList .reveal').forEach((el) => io.observe(el))
  // abrir uma fecha as outras
  faqList.querySelectorAll('details').forEach((d) =>
    d.addEventListener('toggle', () => {
      if (d.open) faqList.querySelectorAll('details').forEach((o) => { if (o !== d) o.open = false })
    })
  )
}

/* ============================================================
   23) BOTÃO VOLTAR AO TOPO (espada)
   ------------------------------------------------------------
   - Aparece depois de descer ~600px
   - O anel à volta mostra quanto já leste da página
   - Ao clicar, a espada dá um golpe para cima e a página sobe
   ============================================================ */
const toTop = document.getElementById('toTop')

if (toTop) {
  let ticking = false

  function updateToTop() {
    const y = window.scrollY
    const max = document.documentElement.scrollHeight - window.innerHeight
    const pct = max > 0 ? Math.min(100, (y / max) * 100) : 0

    toTop.classList.toggle('is-visible', y > 600)
    toTop.style.setProperty('--p', pct.toFixed(1))
    ticking = false
  }

  addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(updateToTop); ticking = true }
  }, { passive: true })
  updateToTop()

  toTop.addEventListener('click', () => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!reduced) {
      // a espada "voa" para cima
      toTop.classList.add('is-slashing')
      setTimeout(() => toTop.classList.remove('is-slashing'), 560)
    }

    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  })
}
