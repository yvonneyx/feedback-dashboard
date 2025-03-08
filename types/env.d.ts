declare namespace NodeJS {
  interface ProcessEnv {
    API_TOKEN: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
} 
