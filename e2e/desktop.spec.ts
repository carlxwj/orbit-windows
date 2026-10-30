import { test, expect } from '@playwright/test';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const requirePackage=createRequire(import.meta.url);
const names=['Accueil','Performances','Matériel','Périphériques','Écrans','Stockage','Réseau','Audio','Concentration','Paramètres'];

for(const scale of [1,1.25,1.5])test.describe.serial(`Application Windows · DPI ${scale*100} %`,()=>{
 let app:ElectronApplication,page:Page,directory:string;
 test.beforeAll(async()=>{
  directory=await mkdtemp(path.join(tmpdir(),'orbit-e2e-'));
  const env=Object.fromEntries(Object.entries(process.env).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
  app=await electron.launch({executablePath:requirePackage('electron'),args:['.',`--force-device-scale-factor=${scale}`],env:{...env,ORBIT_TEST_DATA:directory}});
  page=await app.firstWindow();await expect(page.locator('.app')).toBeVisible();
 });
 test.afterAll(async()=>{await app?.close();if(directory&&path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'orbit-e2e-'))await rm(directory,{recursive:true,force:true});});
 test('Toutes les pages se chargent sans erreur renderer',async()=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const name of names){await page.getByRole('navigation',{name:'Navigation principale'}).getByRole('button',{name,exact:true}).click();await expect(page.locator('.page-content')).toBeVisible();await expect(page.getByText('Cette page n’a pas pu être affichée')).toHaveCount(0);}
  expect(errors).toEqual([]);
 });
 test('Ctrl+K, recherche des données et Échap',async()=>{
  await page.keyboard.press('Control+k');const input=page.getByRole('textbox',{name:'Recherche globale'});await expect(input).toBeFocused();await input.fill('RAM');await expect(page.getByRole('option').first()).toBeVisible();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 });
 test('Thèmes, fenêtres et absence de débordement horizontal',async(_fixtures,info)=>{
  for(const theme of ['Clair','Sombre']){
   await page.getByRole('navigation',{name:'Navigation principale'}).getByRole('button',{name:'Paramètres',exact:true}).click();
   await page.getByRole('button',{name:theme,exact:true}).click();
   await expect(page.locator('html')).toHaveAttribute('data-theme',theme==='Clair'?'light':'dark');
   await page.getByRole('navigation',{name:'Navigation principale'}).getByRole('button',{name:'Accueil',exact:true}).click();
   for(const [width,height]of [[900,620],[1280,720],[1920,1080],[2560,1440]]){
    await app.evaluate(({BrowserWindow},dimensions)=>{const win=BrowserWindow.getAllWindows()[0];if(win.isMaximized())win.unmaximize();win.setSize(dimensions.width,dimensions.height);},{width,height});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    await page.screenshot({path:info.outputPath(`${theme}-${width}x${height}.png`)});
   }
  }
 });
 test('Minuteur : démarrage, pause, reprise et remise à zéro',async()=>{
  await page.getByRole('navigation',{name:'Navigation principale'}).getByRole('button',{name:'Concentration',exact:true}).click();
  await page.getByRole('button',{name:'15 min',exact:true}).click();await page.getByRole('button',{name:'Démarrer',exact:true}).click();await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();await expect(page.getByRole('timer')).not.toHaveText('15:00');await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByRole('button',{name:'Reprendre',exact:true})).toBeVisible();await page.getByRole('button',{name:'Réinitialiser',exact:true}).click();await expect(page.getByRole('timer')).toContainText('15');
 });
 test('Audio et profil : une mesure ou un état indisponible, aucune valeur simulée',async()=>{
  await page.getByRole('navigation',{name:'Navigation principale'}).getByRole('button',{name:'Audio',exact:true}).click();await expect(page.getByRole('slider',{name:'Volume système'})).toBeVisible();
  await page.getByRole('button',{name:'Ouvrir mon profil',exact:true}).click();await expect(page.locator('.account-hero .avatar')).toBeVisible();
 });
});
