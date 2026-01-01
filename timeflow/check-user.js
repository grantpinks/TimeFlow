const { PrismaClient } = require('./node_modules/.prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findFirst();
  console.log('=== Connected Gmail Account ===');
  console.log('Email:', user?.email || 'No user found');
  console.log('Name:', user?.name || 'N/A');
  console.log('Has Google Access Token:', !!user?.googleAccessToken);
  console.log('Has Google Refresh Token:', !!user?.googleRefreshToken);
  console.log('Google ID:', user?.googleId || 'N/A');
  await prisma.$disconnect();
}

checkUser().catch(console.error);
