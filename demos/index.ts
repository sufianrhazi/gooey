import demosManifest from '../demos-manifest.json';
const index = document.getElementById('#index');
console.log(demosManifest);
demosManifest.forEach((demoEntry) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = demoEntry.src;
    a.textContent = `Demo: ${demoEntry.src}`;
    li.appendChild(a);
    index.appendChild(li);
});
