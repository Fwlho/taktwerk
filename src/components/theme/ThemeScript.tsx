// Setzt data-theme vor dem ersten Zeichnen (kein Aufblitzen im falschen Modus).
const script = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
