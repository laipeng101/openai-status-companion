import en from './en.js';
import zhCN from './zh-CN.js';
import zhTW from './zh-TW.js';
import es from './es.js';
import hi from './hi.js';
import ptBR from './pt-BR.js';
import ja from './ja.js';
import ko from './ko.js';
import fr from './fr.js';
import de from './de.js';
import id from './id.js';
import ar from './ar.js';
import ru from './ru.js';

// Order controls the language menu and breaks ties between variants of a language.
const packs = [en, zhCN, zhTW, es, hi, ptBR, ja, ko, fr, de, id, ar, ru];

export const DEFAULT_LOCALE = en.lang;
export const LOCALES = Object.fromEntries(packs.map(pack => [pack.lang, pack]));
