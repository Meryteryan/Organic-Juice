(() => {
'use strict';
const storageKey='organic-juice-cart-v1';
const cards=[...document.querySelectorAll('[data-product]')];
const names=Object.fromEntries(cards.map(c=>[c.dataset.product,c.querySelector('h3').textContent]));
const quantities=Object.fromEntries(cards.map(c=>[c.dataset.product,0]));
let ready=false,busy=false,attempt=null;
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
try{const saved=JSON.parse(localStorage.getItem(storageKey));for(const slug in quantities)if(Number.isInteger(saved?.[slug])&&saved[slug]>=0&&saved[slug]<=99)quantities[slug]=saved[slug];}catch{}
const items=()=>Object.entries(quantities).filter(([,q])=>q>0).map(([slug,quantity])=>({slug,quantity}));
function render(){
 let count=0;
 for(const card of cards){const q=quantities[card.dataset.product];count+=q;card.querySelector('input').value=q;card.querySelector('[data-delta="-1"]').disabled=busy||q===0;card.querySelector('[data-delta="1"]').disabled=busy||q===99;card.querySelector('input').disabled=busy;}
 $('cart-count').textContent=count+' '+(count===1?'jar':'jars');$('cart-total').textContent=money(count*1600);$('cart-empty').hidden=count!==0;$('cart-checkout').disabled=!ready||busy||count===0;
 $('cart-lines').replaceChildren();
 for(const {slug,quantity} of items()){
 const li=document.createElement('li'),label=document.createElement('span'),price=document.createElement('strong'),remove=document.createElement('button');
 label.textContent=quantity+' × '+names[slug];price.textContent=money(quantity*1600);remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+names[slug]+' from order');remove.disabled=busy;remove.onclick=()=>change(slug,0);li.append(label,price,remove);$('cart-lines').append(li);
 }
 try{localStorage.setItem(storageKey,JSON.stringify(quantities));}catch{}
}
function change(slug,value){quantities[slug]=Math.min(99,Math.max(0,Math.floor(Number(value)||0)));attempt=null;$('cart-error').textContent='';render();}
for(const card of cards){const slug=card.dataset.product;card.querySelectorAll('[data-delta]').forEach(b=>b.onclick=()=>change(slug,quantities[slug]+Number(b.dataset.delta)));card.querySelector('input').addEventListener('input',e=>change(slug,e.target.value));}
$('cart-checkout').onclick=async()=>{
 if(!ready||busy||!items().length)return;
 busy=true;render();$('cart-checkout').textContent='Opening secure checkout…';$('cart-error').textContent='';
 attempt||=crypto.randomUUID();
 try{
  const selected=items();
  const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:selected,attempt})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Please try checkout again.');
  const url=new URL(data.url);if(url.origin!=='https://checkout.stripe.com')throw new Error('Checkout could not be opened.');
  try{sessionStorage.setItem('organic-juice-pending-cart',JSON.stringify(quantities));}catch{}
  location.assign(url.href);
 }catch(e){$('cart-error').textContent=e.message||'Unable to connect. Your selections are saved.';busy=false;$('cart-checkout').textContent='Checkout →';render();}
};
if(new URLSearchParams(location.search).get('checkout')==='cancelled')$('cart-error').textContent='Checkout was cancelled. Your selections are still here.';
render();
fetch('/api/config').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(config=>{
 ready=config.checkoutReady===true;
 // Test-mode notices show only while a Stripe test key is in use.
 const test=config.testMode!==false;
 document.querySelectorAll('.sandbox-notice').forEach(n=>n.hidden=!(ready&&test));
 $('checkout-connection').textContent=!ready?'Online checkout isn’t available right now. Your selections are saved.':test?'Test mode · No real money will be charged.':'Secure checkout by Stripe.';render();
}).catch(()=>{$('checkout-connection').textContent='Checkout connection unavailable. Your selections are saved.';});
})();
