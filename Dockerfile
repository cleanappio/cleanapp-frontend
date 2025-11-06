# Stage 1: Build the application
FROM node:24-slim AS builder

# Set working directory
WORKDIR /app

# Set environment variables
ENV NEXT_PUBLIC_API_URL=https://api.cleanapp.io
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51RaMSvF5CkX59Cnm7ZTuIIx0Fg1cQxqilIpOHippAYaVqFMDft3AESH5Ih8aPn4wUFL2VX3Ou9LvwCgqD5O0SDvF00a8ybMiUq
ENV NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiY2xlYW5hcHAiLCJhIjoiY21jM3Zsb2s4MDlsbjJqb2ZzZGtpOWZvYSJ9.YIy8EXQ9IFtmGs55z71-NQ
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB-jjxGzdKREb-318-xNvrCpMmw4FCLBw4
ENV NEXT_PUBLIC_LIVE_API_URL=https://live.cleanapp.io
ENV NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL=wss://live.cleanapp.io
ENV NEXT_PUBLIC_EMBEDDED_MODE=false
ENV NEXT_PUBLIC_MONTENEGRO_API_URL=https://apimontenegro.cleanapp.io
ENV NEXT_PUBLIC_DEVCONNECT2025_API_URL=https://devconnect2025.cleanapp.io
ENV NEXT_PUBLIC_EDGE_CITY_API_URL=https://apiedgecity.cleanapp.io
ENV NEXT_PUBLIC_NEW_YORK_API_URL=https://apinewyork.cleanapp.io
ENV NEXT_PUBLIC_REDBULL_API_URL=https://apiredbull.cleanapp.io
ENV NEXT_PUBLIC_AUTH_API_URL=https://auth.cleanapp.io
ENV NEXT_PUBLIC_AREAS_API_URL=https://areas.cleanapp.io
ENV NEXT_PUBLIC_PLAYSTORE_URL=https://play.google.com/store/apps/details?id=com.cleanapp
ENV NEXT_PUBLIC_APPSTORE_URL=https://apps.apple.com/us/app/cleanapp/id6466403301
ENV NEXT_PUBLIC_REF_API_URL=http://api.cleanapp.io:8080/write_referral
ENV NEXT_PUBLIC_REPORT_PROCESSING_API_URL=https://processing.cleanapp.io
ENV NEXT_PUBLIC_EMAIL_API_URL=https://email.cleanapp.io
ENV NEXT_PUBLIC_WEBSITE_URL=https://www.cleanapp.io
ENV NEXT_PUBLIC_REPORT_COUNT_URL=http://api.cleanapp.io:8080/valid-reports-count
ENV NEXT_PUBLIC_RENDERER_API_URL=https://renderer.cleanapp.io

# Install system dependencies required for canvas and native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

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
FROM node:24-slim AS runner

# Set environment variables
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Install runtime dependencies for canvas
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

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
