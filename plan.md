# Project Overview: Logistics Management System (LMS)


## 1. Project Description

The **Logistics Management System (LMS)** is a centralized digital platform built to help logistics companies run their operations smoothly and efficiently. It brings together customer orders, delivery vehicles, warehouse movement, delivery routes, and customer records into **one unified system**.

In a logistics company, the core job is **moving goods from point A to point B**—not holding or replenishing inventory. LMS is built around this reality. It tracks every shipment as it moves through the network, from the moment an order is placed until it reaches the customer's doorstep.

The system provides:
- End-to-end order tracking with real-time status updates
- Vehicle and driver assignment with maintenance scheduling
- Warehouse tracking focused on *movement* and *dwell time*, not reordering stock
- Visual route planning with map-based visualization
- Customer management with order history and feedback

A key feature is the **Rule-Based Intelligence Engine**. Instead of using complex AI, the system uses clear, logical rules to generate alerts. For example: *"Vehicle hasn't had maintenance in 90 days"* or *"Shipment is 2 hours behind schedule."* Every alert is transparent and easy to understand.

The system includes **visual map integration** for displaying routes and delivery progress. In the MVP, route progress is simulated—after a driver is assigned, the system advances the shipment status along the planned route at intervals matching the expected travel time. This allows the client to see the complete workflow without requiring real GPS hardware.

**Ultimate goals:** Reduce manual work, improve operational visibility, and help teams make faster, better decisions.

---

## 2. Core Modules

### 📦 Order & Shipment Management
- Handles the complete journey of a shipment from placement to delivery.
- Automatically generates a unique tracking ID for every shipment.
- Supports priority levels: Normal, Express, Urgent.
- Status flow: `Pending` → `Assigned` → `In-Transit` → `Delivered`.
- Stores pickup/delivery addresses, weight, dimensions, and expected vs. actual delivery times.

### 🚚 Fleet & Vehicle Management
- Maintains records of all company vehicles (trucks, vans, bikes, etc.).
- Tracks vehicle status: `Available`, `On Route`, `Under Maintenance`.
- Logs fuel usage and trip distances for cost monitoring.
- Schedules maintenance and sends reminders before due dates.
- Links vehicles to assigned drivers for accountability.

### 🏭 Warehouse & Inventory Control
- Tracks customer goods currently in the warehouse and their physical locations (zone, shelf, pallet).
- Logs all stock movements: inbound receipts, outbound dispatches, and returns.
- **Capacity monitoring:** Shows current utilization vs. maximum capacity.
- **Dwell time alerts:** Flags items that have been in the warehouse longer than expected, helping prioritize aging shipments.
- Provides visibility into inbound arrivals and outbound dispatches to help staff plan daily work.
- *Note: This is a movement-tracking system. The logistics company does not own the inventory, so there are no reorder thresholds or stock purchasing features.*

### 🗺️ Route Planning & Delivery Optimization
- Defines delivery routes with start and end points.
- Assigns routes to specific vehicles and drivers.
- Calculates planned distance and expected travel time.
- **Visual Map Display:** Shows routes, pickup points, and delivery locations on an interactive map.
- **Simulated Progress:** After a driver is assigned, the system simulates the trip by automatically updating the shipment status at intervals matching the planned travel time. A marker moves along the route for visual demonstration.
- Detects deviations from the assigned route (based on reported actual path vs. planned path) and flags them for review.
- Measures route efficiency to improve future planning.

### 👥 Customer Management
- Stores customer contact details, delivery addresses, and order history.
- Tracks outstanding payment balances.
- Allows customers to provide feedback and ratings after delivery.
- Enables customers to track their shipments using the unique tracking ID.

### 🧠 Rule-Based Intelligence Engine
- Runs in the background across all modules.
- Uses transparent, understandable rules to generate alerts:
  - *"Shipment #XYZ is 2 hours behind schedule"*
  - *"Vehicle ABC is due for maintenance in 3 days"*
  - *"Item SKU-123 has been in warehouse for 5 days—prioritize dispatch"*
  - *"Driver took a 15% longer route than planned"*
- All rules are based on business logic, not black-box AI, so operations staff can trust and understand every alert.

### 📊 Dashboard & Analytics
- Provides a visual overview of key operations.
- Displays metrics: on-time delivery rate, average fuel consumption per km, active alerts, warehouse capacity utilization.
- Helps Admins spot trends and bottlenecks without digging through raw data.

---

## 3. Core Workflow: Order to Delivery

This is the main operational flow that the system supports:

```
1. ORDER PLACED
   ↓
2. ADMIN ASSIGNS Driver + Vehicle
   ↓
3. SYSTEM SIMULATES ROUTE
   - Planned distance calculated
   - Status updates at intervals matching travel time
   - Marker moves on map
   ↓
4. TRIP "COMPLETES" after simulated duration
   ↓
5. DASHBOARD UPDATES
   - Customer can view completion status
   - Analytics capture on-time performance
```

**All notifications related to this workflow appear as in-app notifications.** No email or SMS in the MVP.

---

## 4. System Entities: Who Uses the System

### 🔐 Internal Users

#### 👑 Admin
- **Role:** Super-user who oversees all operations and handles coordination.
- **Capabilities:**
  - Manage all user accounts (create, update, deactivate Drivers)
  - View and manage all orders, shipments, vehicles, routes, and warehouse movements
  - Assign routes and trips to Drivers and vehicles
  - Monitor fleet status and approve maintenance
  - Log warehouse movements (inbound, outbound, returns)
  - Configure system rules and alert thresholds
  - Access all reports and analytics
  - View customer records and outstanding balances
  - Use the map view to plan routes and monitor simulated progress

#### 🚗 Driver
- **Role:** Executes deliveries and reports trip activity.
- **Capabilities:**
  - View assigned trips, routes, and delivery details
  - Update trip status: `Start Trip`, `Complete Trip`
  - Log fuel used and distance covered
  - Report issues or delays encountered
  - View their assigned route on the map
  - Access only their own assigned tasks—no access to other drivers' data or system settings

### 🌐 External Stakeholder

#### 🛍️ Customer
- **Role:** The person or business requesting a shipment.
- **Capabilities:**
  - Place shipment orders with pickup/delivery details and priority level
  - Track shipment status using a unique tracking ID
  - View order history and outstanding payment balance
  - Submit feedback and ratings after delivery

---

## 5. Notification System

All notifications are **in-app only** for the MVP. They appear in a notification panel accessible from the dashboard.

| Notification Type | Recipient | Trigger |
|-------------------|-----------|---------|
| New order assigned | Driver | Admin assigns order to driver |
| Shipment delayed | Admin | Estimated delivery time exceeded |
| Vehicle due for maintenance | Admin | Maintenance date approaching |
| Route deviation detected | Admin | Reported path differs from planned route |
| Dwell time exceeded | Admin | Item in warehouse beyond configured threshold |
| Order ready for dispatch | Admin | Order confirmed and awaiting assignment |
| Trip completed | Admin | Driver marks trip complete |

---

## 6. What the System Is (and Is Not)

### ✅ What LMS Does
- Tracks shipments from order to delivery
- Manages vehicles, drivers, and maintenance schedules
- Tracks movement of customer goods through the warehouse
- Plans routes and visualizes them on a map
- Simulates delivery progress for demonstration
- Generates transparent, rule-based alerts
- Provides dashboards and analytics for operations visibility

### ❌ What LMS Does NOT Do (in MVP)
- Reorder inventory or manage stock replenishment
- Send email or SMS notifications
- Integrate with real GPS hardware or live tracking
- Handle billing, invoicing, or payment processing
- Use AI or machine learning for decision-making
- Manage suppliers or procurement

---

> 💡 **Note for Junior Team Members:**
> This document describes *what* the system does and *who* uses it—not *how* to build it. Focus first on understanding the business flow:
> - Orders move from `Pending` → `Assigned` → `In-Transit` → `Delivered`
> - Admin assigns drivers and vehicles
> - The system simulates route progress based on planned travel time
> - Notifications appear only inside the app
> - Warehouse tracks *movement*, not reordering
>
> When designing any feature, ask: *"Does this help track movement, reduce manual work, or improve visibility?"* If not, it may be out of scope for the MVP.