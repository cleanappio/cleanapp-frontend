# Stage 1: Build the application
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Set environment variables
ENV NEXT_PUBLIC_API_URL=https://devapi.cleanapp.io
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ReIGOFW3SknKzLcSITZxoZi8fySW11iQNY1SAe1dpzVOcHS2U05GlMZ6aQCcSdxILX0r6cm8Lx6yz4U8TR8l6HH00ihXdefVs

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy all files and build the app
COPY . .
RUN npm run build

# Stage 2: Run the application with minimal footprint
FROM node:24-alpine AS runner

# Set environment variables
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Only copy necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose the port Next.js will run on
EXPOSE 3000

# Run the Next.js app
CMD ["npm", "start"]
