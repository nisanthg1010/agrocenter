const User = require("../models/User");

async function ensureDefaultUsers() {
  const defaults = [
    {
      role: "admin",
      email: process.env.ADMIN_EMAIL || "ritikaagrocenter2024@gmail.com",
      name: "Admin",
    },
    {
      role: "shopkeeper",
      email: process.env.SHOPKEEPER_EMAIL || "ritikaagrocentersp2024@gmail.com",
      name: "Shop Keeper",
    },
    {
      role: "deliveryagent",
      email: process.env.DELIVERY_EMAIL || "ritikaagrocenterda2024@gmail.com",
      name: "Delivery Agent",
    },
  ];

  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "Ritika@2024";

  for (const entry of defaults) {
    if (!entry.email) continue;

    const existing = await User.findOne({ email: entry.email });

    // If not present, create fresh
    if (!existing) {
      await User.create({
        name: entry.name,
        email: entry.email,
        password: defaultPassword,
        role: entry.role,
      });
      console.log(`Seeded ${entry.role} user: ${entry.email}`);
      continue;
    }

    // Otherwise, update role/password to known values
    let changed = false;
    if (existing.role !== entry.role) {
      existing.role = entry.role;
      changed = true;
      console.log(`Updated role for ${entry.email} -> ${entry.role}`);
    }

    // Always reset password for seeded accounts so known credentials work
    existing.password = defaultPassword;
    changed = true;
    await existing.save();

    if (changed) {
      console.log(`Reset credentials for ${entry.email}`);
    }
  }
}

module.exports = ensureDefaultUsers;
