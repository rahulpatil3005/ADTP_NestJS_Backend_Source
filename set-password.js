const bcrypt = require('bcrypt');
const { execSync } = require('child_process');
const fs = require('fs');

bcrypt.hash('Admin@ADTP2025', 12).then(hash => {
  const sql = `UPDATE auth.users SET password_hash = '${hash}', failed_login_count = 0, locked_until = NULL WHERE email = 'superadmin@avishkardhtp.org';`;
  fs.writeFileSync('D:\\avishkar\\fix.sql', sql);
  execSync('docker exec -i adtp-postgres psql -U adtp_user -d adtp_db < D:\\avishkar\\fix.sql', { shell: 'cmd.exe' });
  console.log('Done. Hash:', hash);
});
