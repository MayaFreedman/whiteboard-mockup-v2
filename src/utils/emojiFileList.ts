/**
 * Complete list of all emoji files from the OpenMoji directory
 * This uses the more manageable generated list for now
 */

import { completeEmojiFileList } from './generateCompleteEmojiList';

export const allEmojiFiles = completeEmojiFileList;
export const TOTAL_EMOJI_COUNT = allEmojiFiles.length;