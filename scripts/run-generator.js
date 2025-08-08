#!/usr/bin/env node

// Run the PNG registry generator
console.log('🚀 Starting emoji categorization generator...');
import('./generatePngRegistry.js').then(() => {
  console.log('✅ Generator completed successfully!');
  console.log('ℹ️ Reminder: Faces will stay in Smileys & Emotion, and 1F6C2/1F6C3/1F6D0 are forced to People.');
}).catch((error) => {
  console.error('❌ Generator failed:', error);
  process.exit(1);
});