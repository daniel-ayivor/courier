const jwt = require("jsonwebtoken");
const User = require("../model/UserModel");
const userSchema = require("../schema/UserSchema");
const bcrypt = require("bcrypt");
const Ajv = require("ajv");  
const nodemailer = require("nodemailer");

const ajv = new Ajv();
const validate = ajv.compile(userSchema);

// Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, password, contact } = req.body;
    const valid = validate(req.body);

    if (!valid) {
      return res.status(400).json({
        message: "Invalid user data",
        errors: validate.errors,
      });
    }
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Username, email, and password are required',
      });
    }
    
    // Hash password
    const hashPassword = await bcrypt.hash(password, 10);
    
    // Create User
    const user = await User.create({
      name,
      email,
      password: hashPassword,
      contact
    });

    res.status(200).json({
      message: "User registered successfully",
      user
    });

  } catch (error) {
    console.log("Error registering user", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({
      where: { email }  // Fix: Sequelize syntax
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Error logging in user", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const user = await User.findAll();
    res.status(200).json({ message: 'Users retrieved successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving users', error });
  }
};

  // Delete a shipment by tracking code
const UserDelete = async (req, res) => {
  const { userId } = req.params;



  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user", error });
  }
};

const deleteAllUser = async (req, res) => {
  try {
    // Delete all shipments from the Shipments table
    const result = await User.destroy({
      where: {},  // No condition, deletes all records
    });

    if (result === 0) {
      return res.status(404).json({ message: 'No shipments found to delete' });
    }

    res.status(200).json({ message: 'All shipments deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting shipments', error });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate Reset Token (JWT)
        const resetToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "15m" } 
        );

        // Send Reset Email
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Request",
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 15 minutes.</p>`
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "Password reset email sent. Please check your inbox." });

    } catch (error) {
        console.error("Error in forgot password", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByPk(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Password reset successfully." });

    } catch (error) {
        console.error("Error resetting password", error);
        res.status(400).json({ message: "Invalid or expired token." });
    }
};


const logoutUser = async (req, res) => {
  try {
    // Invalidate the token (Optional: store token in a blacklist if necessary)
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify the token to ensure it's valid
    jwt.verify(token, process.env.JWT_SECRET, (err) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }
    });

    // Respond with success
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Error during logout", error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { registerUser, loginUser, forgotPassword, resetPassword ,logoutUser,getAllUsers,UserDelete, deleteAllUser};
