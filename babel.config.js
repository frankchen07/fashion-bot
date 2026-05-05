module.exports = (api) => {
    api.cache(true)
    return {
      presets: ["babel-preset-expo"],
      plugins: [
        [
          "module:react-native-dotenv",
          {
            moduleName: "@env",
            path: ".env",
            blacklist: null,
            whitelist: ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"],
            safe: false,
            allowUndefined: true,
          },
        ],
      ],
    }
  }
  
  