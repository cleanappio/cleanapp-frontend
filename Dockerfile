# Stage 1: Build the application
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Set environment variables
ENV NEXT_PUBLIC_API_URL=https://devapi.cleanapp.io
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ReIGOFW3SknKzLcSITZxoZi8fySW11iQNY1SAe1dpzVOcHS2U05GlMZ6aQCcSdxILX0r6cm8Lx6yz4U8TR8l6HH00ihXdefVs
ENV NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiY2xlYW5hcHAiLCJhIjoiY21jM3Zsb2s4MDlsbjJqb2ZzZGtpOWZvYSJ9.YIy8EXQ9IFtmGs55z71-NQ
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB-jjxGzdKREb-318-xNvrCpMmw4FCLBw4
ENV NEXT_PUBLIC_LIVE_API_URL=https://devlive.cleanapp.io
ENV NEXT_PUBLIC_EMBEDDED_MODE=false
ENV NEXT_PUBLIC_MONTENEGRO_API_URL=https://devapimontenegro.cleanapp.io
ENV NEXT_PUBLIC_NEW_YORK_API_URL=https://devapinewyork.cleanapp.io
ENV NEXT_PUBLIC_REDBULL_API_URL=https://devapiredbull.cleanapp.io
ENV NEXT_PUBLIC_AUTH_API_URL=https://devauth.cleanapp.io
ENV NEXT_PUBLIC_AREAS_API_URL=https://devareas.cleanapp.io
ENV NEXT_PUBLIC_PLAYSTORE_URL=https://play.google.com/store/apps/details?id=com.cleanapp
ENV NEXT_PUBLIC_APPSTORE_URL=https://apps.apple.com/us/app/cleanapp/id6466403301
ENV NEXT_PUBLIC_REF_API_URL=http://dev.api.cleanapp.io:8080/write_referral
ENV NEXT_PUBLIC_REPORT_PROCESSING_API_URL=https://devprocessing.cleanapp.io
ENV NEXT_PUBLIC_EMAIL_API_URL=https://devemail.cleanapp.io

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy next.config.js first to ensure it's available
COPY next.config.js ./

# Copy all files and build the app
COPY . .

# Ensure next.config.js is properly copied and has correct permissions
RUN ls -la next.config.js || echo "next.config.js not found"
RUN cat next.config.js

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
COPY --from=builder /app/next.config.js ./next.config.js

# Expose the port Next.js will run on
EXPOSE 3000

# Run the Next.js app
CMD ["npm", "start"]
