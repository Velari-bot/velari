# Ticket Panel Creation Guide

## Overview
The `/createticketpanel` command allows you to create customizable ticket panels with your own text, colors, and styling.

## How to Use

### Basic Usage
1. Use the command: `/createticketpanel channel:#your-channel`
2. A modal will appear with customizable fields
3. Fill in the details and submit
4. The ticket panel will be posted in the specified channel

### Customizable Fields

#### Panel Title
- **Field**: Panel Title
- **Type**: Short text input
- **Default**: 🎫 Support Tickets
- **Max Length**: 256 characters
- **Example**: 🎫 Get Help Here

#### Panel Description
- **Field**: Panel Description  
- **Type**: Paragraph text input
- **Default**: Pre-filled with a professional support description
- **Max Length**: 4000 characters
- **Supports**: Markdown formatting (bold, italic, lists, etc.)

#### Button Text
- **Field**: Button Text
- **Type**: Short text input
- **Default**: 🎫 Create Ticket
- **Max Length**: 80 characters
- **Example**: 🎫 Open Support Ticket

#### Embed Color
- **Field**: Embed Color (hex code)
- **Type**: Short text input
- **Default**: #FF6B9D (Pink)
- **Format**: Must be valid hex color (e.g., #FF6B9D, #4CAF50)
- **Examples**: 
  - #FF6B9D (Pink)
  - #4CAF50 (Green)
  - #2196F3 (Blue)
  - #FF9800 (Orange)

#### Footer Text
- **Field**: Footer Text (optional)
- **Type**: Short text input
- **Default**: Velari Support System
- **Max Length**: 256 characters
- **Optional**: Can be left empty

## Example Configurations

### Professional Support Panel
- **Title**: 🎫 Technical Support
- **Description**: 
  ```
  **Need technical assistance? Our expert team is here to help!**
  
  • **24/7 Support** - Available around the clock
  • **Expert Team** - Certified professionals
  • **Quick Response** - Average response time: 5 minutes
  • **Secure Channel** - Your information stays private
  
  **Click the button below to create a support ticket!**
  ```
- **Button**: 🎫 Get Support
- **Color**: #2196F3
- **Footer**: Velari Technical Support

### Sales Inquiry Panel
- **Title**: 💼 Sales & Pricing
- **Description**:
  ```
  **Interested in our services? Let's discuss your needs!**
  
  • **Free Consultation** - No obligation
  • **Custom Quotes** - Tailored to your budget
  • **Package Deals** - Save with bundles
  • **Priority Support** - Dedicated account manager
  
  **Click below to start your sales inquiry!**
  ```
- **Button**: 💼 Sales Inquiry
- **Color**: #4CAF50
- **Footer**: Velari Sales Team

### Bug Report Panel
- **Title**: 🐛 Bug Reports
- **Description**:
  ```
  **Found a bug? Help us improve by reporting it!**
  
  • **Detailed Reports** - Help us fix issues faster
  • **Developer Attention** - Direct access to our dev team
  • **Status Updates** - Track your report progress
  • **Rewards** - Get credits for valid reports
  
  **Report a bug by clicking the button below!**
  ```
- **Button**: 🐛 Report Bug
- **Color**: #FF9800
- **Footer**: Velari Development Team

## Permissions Required
- **Manage Channels** permission is required to create ticket panels
- The bot needs **Send Messages** and **Embed Links** permissions in the target channel

## Integration
- The created panels use the existing ticket system
- When users click the button, they'll get the standard ticket creation modal
- All existing ticket functionality (creation, closing, permissions) remains the same
- The panel integrates seamlessly with the current support role system

## Tips
1. **Use emojis** in titles and button text to make panels more visually appealing
2. **Keep descriptions concise** but informative
3. **Use consistent colors** that match your server's theme
4. **Test the panel** in a private channel first
5. **Update panels regularly** to keep information current

## Troubleshooting
- **Permission Error**: Make sure you have "Manage Channels" permission
- **Invalid Color**: Use proper hex format (e.g., #FF6B9D)
- **Panel Not Appearing**: Check bot permissions in the target channel
- **Button Not Working**: Ensure the existing ticket system is properly configured 