# Seguridad

## Controles implementados

- Identidad provista por ChatGPT Sites; el administrador requiere una cuenta habilitada en el modelo CMS.
- Autorización RBAC global y por operación en el servidor.
- Segregación entre edición y autorización de una misma versión.
- Control optimista de concurrencia, transiciones explícitas y auditoría append-only.
- Archivos privados en `BUCKET`; descarga pública mediada por validación de estado, embargo y retiro.
- Validación de extensión, firma, tamaño, nombre y metadatos de los archivos.
- Redirecciones de autenticación restringidas a rutas relativas y encabezados de seguridad en la aplicación.

## Secretos y datos sensibles

No registrar tokens, contraseñas, cookies, claves de API ni archivos con información nominada. Las credenciales de correo u otras integraciones se configuran como secretos del entorno y nunca se incorporan a documentación, migraciones, pruebas o datos de ejemplo.

Las vulnerabilidades deben reportarse de forma privada al responsable técnico del sitio. No abrir un issue público con evidencia explotable o datos sensibles.

