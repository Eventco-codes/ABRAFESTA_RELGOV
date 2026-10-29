module.exports=[53269,a=>{"use strict";var b=a.i(51203),c=a.i(37936),d=a.i(18558);a.i(585);var e=a.i(68132),f=a.i(59914),g=a.i(9223),h=a.i(2840),i=a.i(91087),j=a.i(25114),k=a.i(34139),l=a.i(21350);async function m(a){let{inicio:b,fim:c}=(0,k.semanaCorrente)(),d=await (0,j.getResumoSemanalPorSemana)(a,b);if(d)return d;let[f,g,h]=await Promise.all([(0,j.listPautas)(a),(0,j.listPendencias)(a),(0,j.listMovimentacoesRecentes)(a)]),m=(0,l.movimentacoesUltimos7Dias)(h),{manchete:n,lide:o}=(0,l.gerarResumoAutomatico)(f,g,m);return a.createRow({databaseId:i.APPWRITE_DATABASE_ID,tableId:i.TABLES.resumosSemanais,rowId:e.ID.unique(),data:{semanaInicio:b,semanaFim:c,manchete:n,lide:o}})}function n(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function o(a){let{sessionSecret:b}=await (0,g.requireSession)(),{account:c}=(0,h.createSessionClient)(b);await c.updatePrefs({prefs:{ultimaAbaPainel:a}})}async function p(){let{tablesDB:a}=await (0,g.requireRole)("administrador","coordenadorrelgov");await m(a),(0,d.revalidatePath)("/painel")}async function q(){let{tablesDB:a}=await (0,g.requireRole)("administrador","coordenadorrelgov"),b=await m(a),[c,o,p]=await Promise.all([(0,j.listPautas)(a),(0,j.listPendencias)(a),(0,j.listMovimentacoesRecentes)(a)]),q=(0,l.movimentacoesUltimos7Dias)(p),{pautasComMovimentacao:r}=(0,l.gerarResumoAutomatico)(c,o,q),s=(0,k.pendenciasVencidas)(o),{users:t}=(0,h.createAdminClient)(),{users:u}=await t.list({queries:[f.Query.limit(200)]}),v=u.filter(a=>a.status&&(0,i.hasRelgovAccess)(a.labels)&&a.prefs?.receberAlertas!==!1).map(a=>a.email),w="https://relgov.abrafesta.com.br",x=function(a){let{resumo:b,pendenciasVencidas:c,numeros:d,appUrl:e,logoUrl:f}=a,g=c.slice(0,8).map(a=>`<li style="margin:0 0 6px;">${n(a.descricao)} — prazo ${(0,k.formatDateBR)(a.prazoSugerido)}</li>`).join("");return`<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px 0;background:#e8e5de;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
      <tr>
        <td style="background:#16233d;padding:22px 26px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td><img src="${f}" width="132" alt="ABRAFESTA" style="display:block;" /></td>
              <td style="padding-left:16px;border-left:1px solid rgba(255,255,255,.25);padding-right:16px;">
                <span style="font-family:monospace;font-size:9.5px;letter-spacing:.2em;color:rgba(255,255,255,.7);">RELGOV</span>
              </td>
            </tr>
          </table>
          <h1 style="margin:14px 0 0;font-size:21px;line-height:1.3;color:#ffffff;">${n(b.manchete)}</h1>
          <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.6);">${(0,k.formatDateBR)(b.semanaInicio)} — ${(0,k.formatDateBR)(b.semanaFim)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="border:1px solid #e3e0d8;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:600;color:#16233d;">${d.pautasAtivas}</div>
                <div style="font-size:10.5px;color:#6f7480;">pautas ativas</div>
              </td>
              <td width="4"></td>
              <td width="33%" style="border:1px solid #e3e0d8;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:600;color:#16233d;">${d.comMovimentacao}</div>
                <div style="font-size:10.5px;color:#6f7480;">com movimenta\xe7\xe3o</div>
              </td>
              <td width="4"></td>
              <td width="33%" style="border:1px solid #e3e0d8;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:600;color:#b3382c;">${d.prazosVencidos}</div>
                <div style="font-size:10.5px;color:#b3382c;">prazos vencidos</div>
              </td>
            </tr>
          </table>

          <h2 style="margin:22px 0 8px;font-size:14px;color:#16233d;">Movimenta\xe7\xf5es da semana</h2>
          <p style="margin:0;font-size:12.5px;line-height:1.55;color:#4a5160;">${n(b.lide)}</p>

          ${c.length>0?`<div style="margin-top:18px;background:#fdf7f6;border-left:3px solid #b3382c;padding:14px 16px;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#b3382c;">Cobran\xe7as em atraso</p>
                  <ul style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.7;color:#4a5160;">${g}</ul>
                </div>`:""}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr>
              <td align="center">
                <a href="${e}/painel" style="display:inline-block;background:#c8992f;color:#16233d;font-weight:600;font-size:13.5px;padding:12px 26px;border-radius:7px;text-decoration:none;">Abrir painel RelGov</a>
              </td>
            </tr>
          </table>

          <p style="margin:24px 0 0;text-align:center;font-size:11px;line-height:1.6;color:#9aa0ac;">
            RelGov ABRAFESTA \xb7 resumo autom\xe1tico gerado a partir dos dados cadastrados no painel.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`}({resumo:b,pautasComMovimentacao:r,pendenciasVencidas:s,numeros:{pautasAtivas:(0,k.pautasAtivas)(c).length,comMovimentacao:r.length,pendenciasAbertas:(0,k.pendenciasAbertas)(o).length,prazosVencidos:s.length},appUrl:w,logoUrl:`${w}/abrafesta-logo.png`}),y=await a.createRow({databaseId:i.APPWRITE_DATABASE_ID,tableId:i.TABLES.emailLogs,rowId:e.ID.unique(),data:{resumoSemanalId:b.$id,destinatarios:v,assunto:"RelGov ABRAFESTA · resumo da semana",htmlRenderizado:x,status:"RASCUNHO"}});return(0,d.revalidatePath)("/painel"),y.$id}(0,a.i(13095).ensureServerEntryExports)([o,p,q]),(0,c.registerServerReference)(o,"402db972c61e09e1f95cabec7309f543e804aa70ff",null),(0,c.registerServerReference)(p,"008d100a64d14c4921290e8e38dc1dd5e94edf6fc4",null),(0,c.registerServerReference)(q,"00720b05a8a3be4e221329c9d6f8af1fa8a4ed3883",null),a.s([],86130),a.i(86130),a.s(["00720b05a8a3be4e221329c9d6f8af1fa8a4ed3883",0,q,"008d100a64d14c4921290e8e38dc1dd5e94edf6fc4",0,p,"00c39c6115b528393daa624fdace71545188d9918e",()=>b.logout,"402db972c61e09e1f95cabec7309f543e804aa70ff",0,o],53269)},51203,a=>{"use strict";var b=a.i(37936),c=a.i(5246);a.i(70396);var d=a.i(73727),e=a.i(2840);class f extends Error{}function g(){return{endpoint:"https://backend.eventco.com.br/v1",project:"6a83a090002d1ccba004"}}async function h(a){let b=await a.json().catch(()=>null);if(!a.ok)throw new f(b?.message??"Não foi possível criar a sessão.");let{project:c}=g(),d=`a_session_${c}`,e=a.headers.getSetCookie().find(a=>a.startsWith(`${d}=`));if(!e)throw new f("Sessão criada, mas o cookie de sessão não veio na resposta.");return{value:e.split(";")[0].split("=").slice(1).join("="),expire:b.expire}}async function i(a,b){let{endpoint:c,project:d}=g();return h(await fetch(`${c}/account/sessions/email`,{method:"POST",headers:{"Content-Type":"application/json","X-Appwrite-Project":d},body:JSON.stringify({email:a,password:b}),cache:"no-store"}))}var j=a.i(91087);async function k(a,b){(await (0,c.cookies)()).set(j.SESSION_COOKIE_NAME,a,{httpOnly:!0,secure:!0,sameSite:"lax",path:"/",expires:new Date(b)})}async function l(a,b){let c,g=String(b.get("email")??"").trim(),h=String(b.get("password")??"");if(!g||!h)return{error:"Informe e-mail e senha."};try{c=await i(g,h)}catch(a){if(a instanceof f)return{error:"E-mail ou senha inválidos."};throw a}let{account:l}=(0,e.createSessionClient)(c.value),m=await l.get();if(!(0,j.hasRelgovAccess)(m.labels))return await l.deleteSession({sessionId:"current"}),{error:"Este e-mail ainda não tem acesso ao RelGov. Peça um convite ao administrador."};await k(c.value,c.expire),(0,d.redirect)("/painel")}async function m(){let a=await (0,c.cookies)(),b=a.get(j.SESSION_COOKIE_NAME)?.value;if(b)try{let{account:a}=(0,e.createSessionClient)(b);await a.deleteSession({sessionId:"current"})}catch{}a.delete(j.SESSION_COOKIE_NAME),(0,d.redirect)("/login")}(0,a.i(13095).ensureServerEntryExports)([l,m]),(0,b.registerServerReference)(l,"60c42cfb5e909d28e5a4838b0650b009f1b86f9d8f",null),(0,b.registerServerReference)(m,"00c39c6115b528393daa624fdace71545188d9918e",null),a.s(["loginWithPassword",0,l,"logout",0,m],51203)},21350,a=>{"use strict";var b=a.i(49497),c=a.i(34139);a.s(["gerarResumoAutomatico",0,function(a,b,d){let e=[...new Set(d.map(a=>a.pautaId))],f=a.filter(a=>e.includes(a.$id)),g=(0,c.pendenciasVencidas)(b),h=f.length,i=g.length,j=0===h&&0===i?"Semana sem movimentações registradas e sem cobranças em atraso":`${h} ${1===h?"frente avançou":"frentes avançaram"} e ${i} ${1===i?"cobrança está":"cobranças estão"} em atraso`,k=f.slice(0,3).map(a=>a.titulo).join(", ");return{manchete:j,lide:h>0?`A varredura desta semana encontrou movimenta\xe7\xe3o registrada em ${k}${h>3?" e outras pautas":""}. Consulte a coluna de pend\xeancias para as cobran\xe7as em atraso.`:"Nenhuma movimentação foi registrada manualmente nesta semana. Consulte a lista de pautas para o panorama completo.",pautasComMovimentacao:f}},"movimentacoesUltimos7Dias",0,function(a){let c=Date.now()-6048e5;return a.filter(a=>(0,b.parseISO)(a.data).getTime()>=c)}])},13095,(a,b,c)=>{"use strict";function d(a){for(let b=0;b<a.length;b++){let c=a[b];if("function"!=typeof c)throw Object.defineProperty(Error(`A "use server" file can only export async functions, found ${typeof c}.
Read more: https://nextjs.org/docs/messages/invalid-use-server-value`),"__NEXT_ERROR_CODE",{value:"E352",enumerable:!1,configurable:!0})}}Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"ensureServerEntryExports",{enumerable:!0,get:function(){return d}})},37936,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"registerServerReference",{enumerable:!0,get:function(){return d.registerServerReference}});let d=a.r(11857)}];

//# sourceMappingURL=_1oxz4ma._.js.map