import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';

export const markdownSupport = markdown({ extensions: [GFM] });
