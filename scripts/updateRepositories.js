import fs from 'fs';
import path from 'path';

const repositoryFiles = [
  'src/features/auth/authRepository.js',
  'src/features/auth/tokenRepository.js',
  'src/features/billing/billingRepository.js',
  'src/features/notifications/notificationRepository.js',
  'src/features/payments/paymentRepository.js',
  'src/features/permissions/permissionRepository.js',
  'src/features/search/searchRepository.js',
  'src/features/subscription/subscriptionRepository.js'
];

repositoryFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Add asyncHandler import if not present
    if (!content.includes("import asyncHandler from 'express-async-handler'")) {
      const importIndex = content.indexOf('\n');
      content = content.slice(0, importIndex) + "\nimport asyncHandler from 'express-async-handler';" + content.slice(importIndex);
    }
    
    // Remove logger import and usage
    content = content.replace(/import.*logger.*from.*;\n/g, '');
    content = content.replace(/logger\.[a-z]+\([^)]*\);\n?/g, '');
    content = content.replace(/logger\.[a-z]+\([^}]*}\s*\);\n?/g, '');
    
    // Wrap functions in asyncHandler and remove try-catch
    content = content.replace(
      /export const (\w+) = async \(([^)]*)\) => \{\s*try \{([\s\S]*?)\} catch[^}]*\}\s*\};/g,
      'export const $1 = asyncHandler(async ($2) => {$3});'
    );
    
    // Clean up extra whitespace
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${filePath}`);
  }
});