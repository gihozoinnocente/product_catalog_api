#!/bin/bash

# Product Catalog API Setup Script

echo "Setting up Product Catalog API..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js (v14 or higher) and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm and try again."
    exit 1
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "MySQL is not installed. Please install MySQL (v8 or higher) and try again."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo "Please update the .env file with your database credentials."
fi

# Ask if the user wants to create the database
read -p "Do you want to create the database? (y/n): " create_db
if [ "$create_db" = "y" ] || [ "$create_db" = "Y" ]; then
    # Get database credentials
    read -p "MySQL username (default: root): " db_user
    db_user=${db_user:-root}
    
    read -s -p "MySQL password: " db_password
    echo ""
    
    # Create database
    echo "Creating database..."
    
    mysql -u $db_user -p$db_password <<EOF
    CREATE DATABASE IF NOT EXISTS product_catalog;
EOF
    
    if [ $? -eq 0 ]; then
        echo "Database created successfully."
        # Update .env file with database credentials
        sed -i "s/DB_USER=.*/DB_USER=$db_user/" .env
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$db_password/" .env
    else
        echo "Failed to create database. Please check your credentials and try again."
        exit 1
    fi
    
    # Ask if the user wants to import sample data
    read -p "Do you want to import sample data? (y/n): " import_data
    if [ "$import_data" = "y" ] || [ "$import_data" = "Y" ]; then
        echo "Importing sample data..."
        mysql -u $db_user -p$db_password product_catalog < sql-setup.sql
        
        if [ $? -eq 0 ]; then
            echo "Sample data imported successfully."
        else
            echo "Failed to import sample data."
        fi
    fi
fi

# Generate a random JWT secret
jwt_secret=$(openssl rand -hex 32)
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env

echo "Setup completed!"
echo "To start the server in development mode, run: npm run dev"
echo "To start the server in production mode, run: npm start"
echo "To access the API documentation, visit: http://localhost:3000/api-docs"