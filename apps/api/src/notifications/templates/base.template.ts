export function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #F7F8FA; font-family: 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #FFFFFF; border-radius: 12px; padding: 32px; border: 1px solid #E2E6ED; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #1F3864; }
    .content { color: #111827; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background: #FF6B35; color: #FFFFFF; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 24px; color: #6B7280; font-size: 12px; }
    .muted { color: #6B7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">WEIXTROM</div>
        <div class="muted">MecaniControl Vehicular</div>
      </div>
      <div class="content">
        ${content}
      </div>
    </div>
    <div class="footer">
      Este correo fue enviado por WEIXTROM. Si no solicitaste esta accion, puedes ignorar este mensaje.
    </div>
  </div>
</body>
</html>`;
}
