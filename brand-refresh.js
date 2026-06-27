import './brand-public.css';
import './brand-calendar.css';
import './brand-app.css';
import './brand-responsive.css';

const logoUrl = new URL('./assets/logo-frontovaya.svg', import.meta.url).href;

function replaceBrandMarks() {
  document.querySelectorAll('.public-logo .brand-mark, .auth-brand .brand-mark, .sidebar .brand-mark')
    .forEach(mark => {
      mark.innerHTML = `<img src="${logoUrl}" alt="Фронтовая агитбригада">`;
    });
}

function refreshHero() {
  const hero = document.querySelector('.public-hero');
  const copy = document.querySelector('.public-hero-grid > div:first-child');
  const title = hero?.querySelector('h1');
  const lead = hero?.querySelector('.public-hero-lead');
  const purpose = hero?.querySelector('.public-purpose-card');
  if (!hero || !copy || !title || hero.dataset.brandReady === 'true') return;

  hero.dataset.brandReady = 'true';
  copy.classList.add('public-hero-copy');
  title.innerHTML = '<span>Фронтовая</span><em>агитбригада</em>';

  const motto = document.createElement('div');
  motto.className = 'public-brand-motto';
  motto.textContent = 'Помним. Поём. Гордимся.';
  title.insertAdjacentElement('afterend', motto);

  if (lead) {
    lead.textContent = 'История, которую можно увидеть, услышать и прожить. Проект объединяет историческую реконструкцию, музыку, семейную память, просветительские форматы и живое участие молодёжи Кемского муниципального округа.';

    const values = document.createElement('div');
    values.className = 'public-brand-values';
    values.innerHTML = '<span>Патриотизм</span><span>Память</span><span>Культура</span><span>История</span>';
    lead.insertAdjacentElement('afterend', values);
  }

  if (purpose) {
    const image = document.createElement('img');
    image.className = 'public-purpose-logo';
    image.src = logoUrl;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    purpose.prepend(image);
  }
}

function installBrand() {
  replaceBrandMarks();
  refreshHero();
}

installBrand();
window.addEventListener('pageshow', installBrand);
