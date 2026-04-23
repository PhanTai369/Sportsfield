const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

// Database configuration
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'password';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;

// For production, use DATABASE_URL if provided (Render/Heroku style)
let sequelizeConfig;
if (process.env.DATABASE_URL) {
  sequelizeConfig = {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  };
} else {
  sequelizeConfig = {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  };
}

// Initialize main Sequelize connection
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, sequelizeConfig)
  : new Sequelize(dbName, dbUser, dbPassword, sequelizeConfig);

// Function to create database if it doesn't exist
const createDatabaseIfNotExists = async () => {
  // Connect to postgres database initially
  const pool = new Pool({
    user: dbUser,
    host: dbHost,
    password: dbPassword,
    port: dbPort,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    // Check if our database exists
    const checkDbResult = await pool.query(
      `SELECT FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    // If database doesn't exist, create it
    if (checkDbResult.rowCount === 0) {
      console.log(`Database "${dbName}" not found, creating it now...`);
      await pool.query(`CREATE DATABASE "${dbName}";`);
      console.log(`Database "${dbName}" created successfully`);
    } else {
      console.log(`Database "${dbName}" already exists`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Test and initialize database connection
const testDbConnection = async () => {
  try {
    // For production with external database (like Supabase), skip database creation
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
      console.log('Using external database, skipping database creation check...');
    } else {
      // Only try to create database in development
      await createDatabaseIfNotExists();
    }
    
    // Authenticate connection to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testDbConnection,
  createDatabaseIfNotExists
}; 