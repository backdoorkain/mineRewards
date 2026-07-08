# 1. Usar una imagen oficial de Node.js ligera como base
FROM node:20-alpine

# 2. Crear y definir el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar los archivos de dependencias primero para aprovechar la caché de Docker
COPY package*.json ./

# 4. Instalar las dependencias de producción de forma limpia
RUN npm ci --only=production

# 5. Copiar el resto de los archivos de la aplicación (index.js, index.html, etc.)
COPY . .

# 6. Exponer el puerto en el que corre tu aplicación Express
EXPOSE 3000

# 7. Comando para iniciar la aplicación web
CMD ["node", "index.js"]
