// ============================================================
// ASCENCÍON — backend.js
// CAMADA ÚNICA de dados: autenticação, fórum e avaliações.
//
// Hoje corre em modo SIMULADO (guarda no localStorage do navegador).
// Para ligar o SUPABASE real, só tens de:
//   1. Criar o projeto em supabase.com
//   2. Preencher SUPABASE_URL e SUPABASE_ANON_KEY (em script.js)
//   3. Rodar o SQL que está no fim deste ficheiro (comentado)
//   4. Trocar cada função abaixo pela versão Supabase (também comentada)
//
// A interface (UI) NÃO muda nada disto — só chama estas funções.
// ============================================================

// O cliente supabase é criado em script.js e passado para aqui.
// Enquanto for null, corre tudo em modo simulado.
let _supabase = null
export function setSupabaseClient(client) { _supabase = client }
export function isLive() { return !!_supabase }

/* ------------------------------------------------------------
   Utilidades do modo simulado (localStorage)
   ------------------------------------------------------------ */
const LS = {
  users: 'asc_users',
  session: 'asc_session',
  threads: 'asc_threads',
  reviews: 'asc_reviews',
}
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function wait(ms) { return new Promise((r) => setTimeout(r, ms)) }

/* ============================================================
   AUTENTICAÇÃO
   ============================================================ */

export async function signUp({ name, email, password }) {
  if (_supabase) {
    // ---- SUPABASE ----
    const { data, error } = await _supabase.auth.signUp({
      email, password, options: { data: { name } },
    })
    if (error) throw new Error(traduzErro(error.message))
    // Com confirmação de email ativa, o utilizador recebe um email.
    return { needsConfirmation: !data.session, user: data.user }
  }

  // ---- SIMULADO ----
  await wait(700)
  const users = read(LS.users, [])
  if (users.some((u) => u.email === email.toLowerCase())) {
    throw new Error('Já existe uma conta com este e-mail.')
  }
  const user = { id: uid(), name, email: email.toLowerCase(), password }
  users.push(user)
  write(LS.users, users)
  // no modo simulado não há email real; entra logo
  const session = { id: user.id, name: user.name, email: user.email }
  write(LS.session, session)
  return { needsConfirmation: false, user: session }
}

export async function signIn({ email, password }) {
  if (_supabase) {
    // ---- SUPABASE ----
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(traduzErro(error.message))
    const u = data.user
    return { id: u.id, name: u.user_metadata?.name || u.email, email: u.email }
  }

  // ---- SIMULADO ----
  await wait(700)
  const users = read(LS.users, [])
  const user = users.find((u) => u.email === email.toLowerCase() && u.password === password)
  if (!user) throw new Error('E-mail ou palavra-passe incorretos.')
  const session = { id: user.id, name: user.name, email: user.email }
  write(LS.session, session)
  return session
}

export async function signOut() {
  if (_supabase) { await _supabase.auth.signOut(); return }
  localStorage.removeItem(LS.session)
}

export async function getCurrentUser() {
  if (_supabase) {
    const { data } = await _supabase.auth.getUser()
    if (!data.user) return null
    const u = data.user
    return { id: u.id, name: u.user_metadata?.name || u.email, email: u.email }
  }
  return read(LS.session, null)
}

/* ============================================================
   FÓRUM (tópicos + respostas)
   ============================================================ */

export async function getThreads() {
  if (_supabase) {
    const { data, error } = await _supabase
      .from('threads').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
  return read(LS.threads, []).sort((a, b) => b.created_at - a.created_at)
}

export async function createThread({ user, title, body }) {
  if (_supabase) {
    const { data, error } = await _supabase.from('threads').insert({
      title, body, author_id: user.id, author_name: user.name, author_email: user.email, replies: [],
    }).select().single()
    if (error) throw error
    return data
  }
  await wait(300)
  const threads = read(LS.threads, [])
  const thread = {
    id: uid(), title, body,
    author_id: user.id, author_name: user.name, author_email: user.email,
    created_at: Date.now(), replies: [],
  }
  threads.push(thread)
  write(LS.threads, threads)
  return thread
}

export async function addReply({ threadId, user, body }) {
  if (_supabase) {
    // Numa BD real, respostas costumam ser tabela própria; aqui simplificado
    // como array JSONB na thread para manter o mock e o real iguais.
    const { data: t, error: e1 } = await _supabase
      .from('threads').select('replies').eq('id', threadId).single()
    if (e1) throw e1
    const replies = [...(t.replies || []), {
      id: crypto.randomUUID(), author_name: user.name, author_email: user.email, body, created_at: Date.now(),
    }]
    const { data, error } = await _supabase
      .from('threads').update({ replies }).eq('id', threadId).select().single()
    if (error) throw error
    return data
  }
  await wait(200)
  const threads = read(LS.threads, [])
  const thread = threads.find((t) => t.id === threadId)
  if (!thread) throw new Error('Tópico não encontrado.')
  thread.replies.push({ id: uid(), author_name: user.name, author_email: user.email, body, created_at: Date.now() })
  write(LS.threads, threads)
  return thread
}

/* ============================================================
   AVALIAÇÕES
   ============================================================ */

export async function getReviews() {
  if (_supabase) {
    const { data, error } = await _supabase
      .from('reviews').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
  return read(LS.reviews, []).sort((a, b) => b.created_at - a.created_at)
}

export async function createReview({ user, rating, body }) {
  if (_supabase) {
    const { data, error } = await _supabase.from('reviews').insert({
      rating, body, author_id: user.id, author_name: user.name, author_email: user.email,
    }).select().single()
    if (error) throw error
    return data
  }
  await wait(300)
  const reviews = read(LS.reviews, [])
  const review = {
    id: uid(), rating, body,
    author_id: user.id, author_name: user.name, author_email: user.email, created_at: Date.now(),
  }
  reviews.push(review)
  write(LS.reviews, reviews)
  return review
}

/* ============================================================
   ADMIN — roles (owner/admin), gestão de utilizadores, calendário
   ============================================================ */

// O DONO (super-admin). Só ele pode promover/despromover outros.
// No modo demo, mantém-se aqui; no Supabase, a fonte é a tabela 'admins'.
const OWNER_EMAIL = 'nunoalexandreloureiro@gmail.com'

// Cache da lista de admins (para destacar nomes sem estar sempre a consultar).
let _adminsCache = null

// Devolve a lista completa de admins: [{ email, role }]
export async function getAdmins() {
  if (_supabase) {
    const { data, error } = await _supabase.from('admins').select('email, role')
    if (error) { console.warn('getAdmins:', error.message); return [] }
    _adminsCache = data
    return data
  }
  const demo = read('asc_admins', [{ email: OWNER_EMAIL, role: 'owner' }])
  _adminsCache = demo
  return demo
}

// Papel do utilizador: 'owner', 'admin' ou null
export async function getRole(user) {
  if (!user) return null
  const admins = _adminsCache || await getAdmins()
  const row = admins.find((a) => (a.email || '').toLowerCase() === (user.email || '').toLowerCase())
  return row ? row.role : null
}

// Atalhos
export async function isAdmin(user) { const r = await getRole(user); return r === 'admin' || r === 'owner' }
export async function isOwner(user) { return (await getRole(user)) === 'owner' }

// Conjunto de emails admin (para destacar nomes na UI). Usa a cache.
export function adminEmailsSync() {
  return new Set((_adminsCache || []).map((a) => (a.email || '').toLowerCase()))
}

// --- Promover / despromover (só o dono pode) ---
export async function grantAdmin(owner, email) {
  if (_supabase) {
    const { data, error } = await _supabase.functions.invoke('admin-users', {
      body: { action: 'grant', email },
    })
    if (error) throw new Error(error.message)
    _adminsCache = null // força recarregar
    return data
  }
  await wait(150)
  const admins = read('asc_admins', [{ email: OWNER_EMAIL, role: 'owner' }])
  if (!admins.some((a) => a.email === email.toLowerCase()))
    admins.push({ email: email.toLowerCase(), role: 'admin' })
  write('asc_admins', admins); _adminsCache = null
  return { ok: true }
}

export async function revokeAdmin(owner, email) {
  if (_supabase) {
    const { data, error } = await _supabase.functions.invoke('admin-users', {
      body: { action: 'revoke', email },
    })
    if (error) throw new Error(error.message)
    _adminsCache = null
    return data
  }
  await wait(150)
  let admins = read('asc_admins', [{ email: OWNER_EMAIL, role: 'owner' }])
  admins = admins.filter((a) => a.email !== email.toLowerCase() || a.role === 'owner')
  write('asc_admins', admins); _adminsCache = null
  return { ok: true }
}

// Lista os utilizadores (para o painel admin).
export async function adminListUsers(user) {
  if (_supabase) {
    const { data, error } = await _supabase.functions.invoke('admin-users', {
      body: { action: 'list' },
    })
    if (error) throw new Error(error.message)
    return data.users
  }
  await wait(300)
  return read(LS.users, []).map((u) => ({
    id: u.id, email: u.email, name: u.name, created_at: u.created_at || null,
  }))
}

export async function adminDeleteUser(user, targetId) {
  if (_supabase) {
    const { data, error } = await _supabase.functions.invoke('admin-users', {
      body: { action: 'delete', targetId },
    })
    if (error) throw new Error(error.message)
    return data
  }
  await wait(200)
  const users = read(LS.users, []).filter((u) => u.id !== targetId)
  write(LS.users, users)
  return { ok: true }
}

/* ------------------------ CALENDÁRIO DE UPDATES ------------------------ */

export async function getUpdates() {
  if (_supabase) {
    const { data, error } = await _supabase
      .from('updates').select('*').order('date', { ascending: true })
    if (error) throw error
    return data
  }
  return read('asc_updates', []).sort((a, b) => a.date.localeCompare(b.date))
}

export async function createUpdate(user, { date, title, body, tag }) {
  if (_supabase) {
    const { data, error } = await _supabase.from('updates').insert({
      date, title, body, tag, author_name: user.name,
    }).select().single()
    if (error) throw new Error(traduzErro(error.message))
    return data
  }
  await wait(200)
  const updates = read('asc_updates', [])
  const u = { id: uid(), date, title, body, tag, author_name: user.name, created_at: Date.now() }
  updates.push(u)
  write('asc_updates', updates)
  return u
}

export async function deleteUpdate(user, id) {
  if (_supabase) {
    const { error } = await _supabase.from('updates').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true }
  }
  await wait(150)
  write('asc_updates', read('asc_updates', []).filter((u) => u.id !== id))
  return { ok: true }
}

/* ------------------------ COMPRAS (log admin) ------------------------ */

export async function getOrders() {
  if (_supabase) {
    const { data, error } = await _supabase
      .from('orders').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(traduzErro(error.message))
    return data
  }
  const all = read('asc_orders', [])
  return all.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
}

/* ------------------------ MODERAÇÃO (admin) ------------------------ */

export async function deleteThread(user, id) {
  if (_supabase) {
    const { error } = await _supabase.from('threads').delete().eq('id', id)
    if (error) throw new Error(traduzErro(error.message))
    return { ok: true }
  }
  await wait(150)
  write(LS.threads, read(LS.threads, []).filter((t) => t.id !== id))
  return { ok: true }
}

export async function deleteReply(user, threadId, replyId) {
  if (_supabase) {
    const { data: t, error: e1 } = await _supabase
      .from('threads').select('replies').eq('id', threadId).single()
    if (e1) throw e1
    const replies = (t.replies || []).filter((r) => r.id !== replyId)
    const { error } = await _supabase.from('threads').update({ replies }).eq('id', threadId)
    if (error) throw new Error(traduzErro(error.message))
    return { ok: true }
  }
  await wait(150)
  const threads = read(LS.threads, [])
  const th = threads.find((t) => t.id === threadId)
  if (th) th.replies = (th.replies || []).filter((r) => r.id !== replyId)
  write(LS.threads, threads)
  return { ok: true }
}

export async function deleteReview(user, id) {
  if (_supabase) {
    const { error } = await _supabase.from('reviews').delete().eq('id', id)
    if (error) throw new Error(traduzErro(error.message))
    return { ok: true }
  }
  await wait(150)
  write(LS.reviews, read(LS.reviews, []).filter((r) => r.id !== id))
  return { ok: true }
}

/* ------------------------ REPOSIÇÃO DE PALAVRA-PASSE ------------------------ */

/**
 * Envia o email com o link de reposição.
 * O Supabase trata do envio e do link seguro (expira ~1h, uso único).
 */
export async function requestPasswordReset(email) {
  if (_supabase) {
    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
      // para onde a pessoa volta depois de clicar no link do email
      redirectTo: window.location.origin + window.location.pathname,
    })
    if (error) throw new Error(traduzErro(error.message))
    return { ok: true }
  }

  // MODO DEMO: não há email real. Confirmamos se a conta existe.
  await wait(700)
  const users = read(LS.users, [])
  const exists = users.some((u) => u.email === email.toLowerCase())
  // Por segurança, respondemos igual exista ou não (não revelamos contas)
  return { ok: true, demoExists: exists }
}

/**
 * Define a nova palavra-passe.
 * No Supabase só funciona quando há sessão de recuperação (vinda do link).
 */
export async function updatePassword(newPassword, email = null) {
  if (_supabase) {
    const { error } = await _supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(traduzErro(error.message))
    return { ok: true }
  }

  // MODO DEMO: muda direto (só serve para testar a interface)
  await wait(400)
  const users = read(LS.users, [])
  const u = users.find((x) => x.email === (email || '').toLowerCase())
  if (!u) throw new Error('Conta não encontrada.')
  u.password = newPassword
  write(LS.users, users)
  return { ok: true }
}

/**
 * IMPORTANTE: o cliente do Supabase LIMPA o # do URL assim que arranca.
 * Por isso guardamos o URL logo no carregamento do módulo, antes disso.
 */
const _initialHash = (typeof window !== 'undefined' ? window.location.hash : '') || ''
const _initialSearch = (typeof window !== 'undefined' ? window.location.search : '') || ''

function _looksLikeRecovery() {
  const blob = _initialHash + _initialSearch
  return blob.includes('type=recovery') || blob.includes('type=magiclink')
}

/**
 * Deteta se a pessoa chegou ao site vindo do link de reposição.
 * Usa três vias, porque o Supabase pode disparar o evento antes
 * de nos registarmos:
 *   1. O URL capturado no arranque (mais fiável)
 *   2. O evento PASSWORD_RECOVERY
 *   3. Verificação de sessão de recuperação
 */
export function onPasswordRecovery(callback) {
  if (!_supabase) return

  let fired = false
  const fire = () => { if (!fired) { fired = true; callback() } }

  // 1) O URL de entrada dizia que era recuperação?
  if (_looksLikeRecovery()) {
    // pequeno atraso para o Supabase acabar de criar a sessão
    setTimeout(fire, 300)
  }

  // 2) Evento oficial (caso ainda não tenha passado)
  _supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') fire()
  })
}

/** Permite ao site saber, sem efeitos, se veio de um link de recuperação. */
export function cameFromRecoveryLink() { return _looksLikeRecovery() }

/* ------------------------------------------------------------
   Traduz mensagens de erro comuns do Supabase Auth para PT
   ------------------------------------------------------------ */
function traduzErro(msg) {
  const m = (msg || '').toLowerCase()
  if (m.includes('already registered')) return 'Já existe uma conta com este e-mail.'
  if (m.includes('invalid login')) return 'E-mail ou palavra-passe incorretos.'
  if (m.includes('email not confirmed')) return 'Confirma o teu e-mail antes de entrar.'
  if (m.includes('should be different')) return 'A nova palavra-passe tem de ser diferente da atual.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiadas tentativas. Espera um pouco e tenta de novo.'
  if (m.includes('expired') || m.includes('invalid') && m.includes('token')) return 'O link expirou ou já foi usado. Pede um novo.'
  if (m.includes('auth session missing') || m.includes('session')) return 'A sessão de recuperação expirou. Pede um novo link.'
  if (m.includes('password')) return 'A palavra-passe não cumpre os requisitos (mín. 6 caracteres).'
  return msg
}

/* ============================================================
   SQL PARA O SUPABASE (corre no SQL Editor quando ligares)
   ------------------------------------------------------------
   -- Fórum
   create table threads (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz default now(),
     title text not null,
     body text not null,
     author_id uuid references auth.users(id),
     author_name text not null,
     replies jsonb default '[]'::jsonb
   );

   -- Avaliações
   create table reviews (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz default now(),
     rating int not null check (rating between 1 and 5),
     body text not null,
     author_id uuid references auth.users(id),
     author_name text not null
   );

   -- Ativa Row Level Security
   alter table threads enable row level security;
   alter table reviews enable row level security;

   -- Toda a gente pode ler
   create policy "ler threads" on threads for select using (true);
   create policy "ler reviews" on reviews for select using (true);

   -- Só utilizadores autenticados podem escrever
   create policy "criar threads" on threads for insert
     with check (auth.uid() = author_id);
   create policy "atualizar threads" on threads for update
     using (true) with check (true);   -- para as respostas (ajusta conforme queiras)
   create policy "criar reviews" on reviews for insert
     with check (auth.uid() = author_id);

   -- Confirmação de email:
   -- Authentication > Providers > Email > "Confirm email" = ON
   ============================================================ */
