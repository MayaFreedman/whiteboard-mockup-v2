#!/usr/bin/env node

// Run the PNG registry generator  
console.log('🚀 Starting emoji categorization generator...');
import('./generatePngRegistry.js').then(() => {
  console.log('✅ Generator completed successfully!');
}).catch((error) => {
  console.error('❌ Generator failed:', error);
  process.exit(1);
});