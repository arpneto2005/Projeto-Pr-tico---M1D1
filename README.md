# Moda Viva — Suporte híbrido

Aplicação de demonstração de atendimento ao cliente, construída com páginas
HTML/CSS/JavaScript, uma API Flask e um banco SQLite.

## Funcionalidades

- Cadastro público de clientes e autenticação por usuário e senha.
- Perfis separados: `customer` (cliente), `attendant` (atendente) e `admin`
  (administrador master).
- Conversas de suporte com identificação de intenção e histórico por conta.
- Atendimento em três camadas:
  1. Regras para perguntas e operações previsíveis.
  2. Classificador local de intenções.
  3. LLM controlada, com recuperação de conteúdo da base de conhecimento (RAG)
     para perguntas que exigem interpretação semântica.
- Abertura de chamados para revisão humana quando necessário. Atendentes podem
  responder, aprovar rascunhos e rotular intenções.
- Consulta de rastreio, previsão de entrega, elegibilidade para troca e prazo de
  reembolso em pedidos de demonstração.
- Gestão administrativa da base de conhecimento, métricas, eventos de segurança
  e criação de contas de atendente.
- Proteções no atendimento, incluindo sanitização de informações pessoais,
  detecção de tentativas de manipulação do prompt, limites de tamanho e de
  mensagens.

## Perfis e permissões

| Perfil | Permissões |
| --- | --- |
| `customer` | Usar o chat, consultar pedidos e ver o FAQ e o horário. O cadastro público sempre cria este perfil. |
| `attendant` | Consultar a fila e aprovar respostas ou rotular chamados. A conta é criada por um admin. |
| `admin` | Permissões de atendente, além de acessar métricas, eventos de segurança, base de conhecimento e gestão de atendentes. |

As permissões são verificadas pela API. Ocultar um link na interface não é o
único controle de acesso.

### Contas de demonstração

Em ambiente de desenvolvimento, a inicialização cria estas contas se elas ainda
não existirem:

| Usuário | Senha inicial | Perfil |
| --- | --- | --- |
| `admin` | `Admin123!` | `admin` |
| `customer` | `Customer123!` | `customer` |

As senhas podem ser definidas por `DEMO_ADMIN_PASSWORD` e
`DEMO_CUSTOMER_PASSWORD`. A senha é armazenada como hash. Se uma conta com o
mesmo nome já existir, a inicialização não substitui sua senha nem seu perfil.
Para uma nova instalação com as contas de demonstração desativadas, defina
`APP_ENV=production`; crie o primeiro admin por um processo administrativo
seguro antes de disponibilizar o sistema.

## Executar localmente

Na pasta `Disciplina 01`, instale Flask e pytest no ambiente Python escolhido:

```powershell
python -m pip install Flask pytest
```

Inicie a API:

```powershell
python -m flask --app aplicacao run --debug --host 127.0.0.1 --port 5000
```

Sirva os arquivos HTML por um servidor web estático separado. Por exemplo, com
Live Server, abra a página `index.html` e use a origem
`http://127.0.0.1:5500` ou `http://localhost:5500`. O endereço da API é montado
em `app.js` usando o hostname da página e a porta `5000`; a página e a API não
devem ser abertas diretamente como arquivos `file://`.

Por padrão, a API aceita requisições com credenciais dessas origens locais na
porta `5500`. Para autorizar outras origens, defina `CORS_ORIGINS` como uma
lista separada por vírgulas, por exemplo:

```text
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

Outras configurações:

| Variável | Uso |
| --- | --- |
| `DB_PATH` | Caminho do banco SQLite. O padrão é `moda_viva.db`. |
| `SECRET_KEY` | Chave usada para assinar as sessões; defina um valor persistente e secreto fora de desenvolvimento. |
| `APP_ENV` | Se igual a `production`, desativa a criação automática das contas de demonstração. |
| `DEMO_ADMIN_PASSWORD` | Senha inicial de demonstração do admin. |
| `DEMO_CUSTOMER_PASSWORD` | Senha inicial de demonstração do cliente. |
| `SESSION_COOKIE_SECURE` | Defina `1` para exigir HTTPS no cookie de sessão. |
| `CORS_ORIGINS` | Origens de frontend permitidas, separadas por vírgulas. |
| `LLM_MODEL` | Identificador do modelo usado pela integração LLM, quando configurada. |
| `ANTHROPIC_API_KEY` | Chave para habilitar a integração Anthropic, quando necessária. |

Ao iniciar, a aplicação cria as tabelas ausentes e migra o banco existente
adicionando a associação entre conversas e usuários.

Execute os testes com:

```powershell
python -m pytest aplicacao.py
```

## Rotas do frontend

As páginas são arquivos estáticos servidos pelo servidor web escolhido; não
existe uma rota de frontend Flask para cada arquivo. A navegação compartilhada
e a chamada à API são implementadas em `app.js`.

| Página/arquivo | Função e perfil |
| --- | --- |
| `index.html` | Página inicial, estado do atendimento e atalhos filtrados conforme o perfil. |
| `auth.html` | Login e cadastro público de clientes. Após login, atendentes vão ao painel de analista; clientes e admins vão à página inicial. |
| `chat.html` | Chat do cliente, exemplos de mensagens, histórico e botões de atendimento. Requer `customer`. |
| `pedidos.html` | Consulta dos pedidos de demonstração por rastreio, prazo, troca e reembolso. Requer `customer`. |
| `faq.html` | FAQ oficial e horário do atendimento. |
| `classificador.html` | Teste de classificação de frases e indicação da camada que as atenderia. |
| `analista.html` | Fila de chamados, aprovação de resposta e rotulagem de intenção. Requer `attendant` ou `admin`. |
| `admin-kb.html` | Consulta, criação, edição e desativação de itens da base de conhecimento. Requer `admin`. |
| `metricas.html` | Métricas do sistema, uso de tokens e eventos de segurança. Requer `admin`. |
| `usuarios.html` | Lista de contas e criação de atendentes. Requer `admin`. |
| `app.js` | Utilitários compartilhados, URL base da API, sessão, navegação por perfil e mensagens de erro. |
| `style.css` | Estilos compartilhados, incluindo tema claro/escuro. |

Páginas HTML não marcadas como restritas na navegação podem ser abertas sem
login, embora operações específicas continuem sujeitas às permissões da API.

## Rotas da API (backend)

Todas as rotas abaixo são relativas à origem da API, normalmente
`http://127.0.0.1:5000`. Rotas JSON com corpo aceitam `Content-Type:
application/json`. O login e o cadastro iniciam uma sessão em cookie; o
frontend envia o cookie com `credentials: "include"`.

### Autenticação

| Método e rota | Acesso | Descrição |
| --- | --- | --- |
| `GET /auth/me` | Público | Retorna `{"usuario": null}` se não houver login ou os dados básicos do usuário autenticado. |
| `POST /auth/register` | Público | Cria uma conta `customer` e inicia a sessão. Corpo: `{"username":"novo.cliente","password":"SenhaSegura123"}`. Usuário: 3–32 caracteres alfanuméricos, ponto, `_` ou `-`; senha: 8–128 caracteres. Retorna `201`; nome duplicado retorna `409`. |
| `POST /auth/login` | Público | Inicia a sessão. Corpo: `{"username":"admin","password":"Admin123!"}`. Credenciais inválidas retornam `401`. |
| `POST /auth/logout` | Público | Encerra a sessão atual. |

### Atendimento, FAQ e pedidos

| Método e rota | Acesso | Descrição |
| --- | --- | --- |
| `POST /chat/mensagem` | `customer` | Envia mensagem ou botão ao atendimento. Corpo: `{"session_id":"id-da-conversa","texto":"Onde está meu pedido?"}` ou substitua `texto` por `botao`. A conversa é associada ao usuário. |
| `GET /chat/<session_id>/mensagens` | `customer` | Retorna o histórico da conversa; outro cliente não pode consultar conversas associadas a uma conta diferente. |
| `GET /faq` | Público | Lista itens ativos da fonte `faq_oficial`. |
| `GET /faq/<kid>` | Público | Retorna o conteúdo de um item ativo da base pelo ID. Retorna `404` se não existir. |
| `GET /atendimento/horario` | Público | Retorna horário, indicador de abertura atual e mensagem de atendimento. |
| `GET /pedidos/<numero>/rastreio` | `customer` | Consulta status e código de rastreio. |
| `GET /pedidos/<numero>/prazo-entrega` | `customer` | Consulta previsão de entrega. |
| `GET /pedidos/<numero>/troca` | `customer` | Consulta elegibilidade e prazo para troca. |
| `GET /pedidos/<numero>/reembolso` | `customer` | Consulta informações e prazo de estorno. |
| `POST /classificar` | Público | Classifica uma frase. Corpo: `{"texto":"cadê minha encomenda?"}`. Retorna intenção, confiança, camada e se deve acionar LLM. |

O catálogo de pedidos e os dados de negócio são exemplos locais de demonstração;
substitua a integração correspondente antes de conectá-la a pedidos reais.

### Atendentes

| Método e rota | Acesso | Descrição |
| --- | --- | --- |
| `GET /analista/fila` | `attendant`, `admin` | Lista chamados aguardando analista, priorizando os de prioridade alta. |
| `POST /analista/tickets/<tid>/aprovar` | `attendant`, `admin` | Envia a resposta final ao cliente. Corpo opcional: `{"texto_final":"Resposta aprovada."}`; se omitido, usa o rascunho disponível. |
| `POST /analista/tickets/<tid>/rotular` | `attendant`, `admin` | Registra a intenção corrigida para treinamento do classificador. Corpo: `{"intencao":"troca"}`. |

### Administração

| Método e rota | Acesso | Descrição |
| --- | --- | --- |
| `GET /admin/conhecimento` | `admin` | Lista todos os itens da base de conhecimento. |
| `POST /admin/conhecimento` | `admin` | Cria ou atualiza um item. Campos obrigatórios: `id`, `fonte`, `titulo`, `conteudo`; `fonte` pode ser `faq_oficial`, `politica_interna` ou `documentacao_operacional`. Campos opcionais: `palavras_chave`, `ativo`. |
| `DELETE /admin/conhecimento/<kid>` | `admin` | Desativa um item da base pelo ID. |
| `GET /metricas` | `admin` | Retorna conversas, automação, chamados, tempos de resposta, uso de tokens e agregados de segurança. |
| `GET /admin/seguranca/eventos?limit=25` | `admin` | Lista eventos de segurança recentes. `limit` é opcional, padrão `50`, máximo `500`. |
| `GET /admin/usuarios` | `admin` | Lista usuários sem incluir hashes de senha. |
| `POST /admin/usuarios` | `admin` | Cria um usuário `attendant`. Corpo: `{"username":"atendente1","password":"SenhaSegura123"}`. |

### Respostas de erro comuns

- `400`: dados obrigatórios ausentes ou inválidos para a operação.
- `401`: autenticação necessária ou credenciais inválidas.
- `403`: usuário autenticado sem o perfil necessário ou tentando acessar uma
  conversa de outra conta.
- `404`: recurso solicitado não encontrado.
- `409`: nome de usuário já cadastrado.
- `422`: dados de cadastro, intenção ou resposta não aceitos.

## Banco de dados

O arquivo SQLite padrão é `moda_viva.db`. Entre as tabelas principais estão:

- `usuarios`: nome de usuário, hash da senha, perfil e data de criação.
- `sessoes`: estado da conversa e usuário proprietário.
- `mensagens`: mensagens do cliente, bot e atendente.
- `tickets`: chamados escalados e estado da resposta humana.
- `kb`: conteúdo autorizado da base de conhecimento usada pelo FAQ/RAG.
- `exemplos`: frases de treino do classificador.
- `uso_llm`: uso de tokens.
- `eventos_seguranca`: eventos associados aos controles de segurança.

Faça backup do banco antes de alterações manuais. Não armazene senhas em texto
simples nem use as senhas de demonstração em ambientes acessíveis publicamente.
