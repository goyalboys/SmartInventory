# Payment Policy

## Accepted Payment Methods

- **Cash on Delivery (COD):** Pay when the order is delivered
- **Razorpay (Online):** Credit/debit cards, UPI, net banking, wallets

## Payment Status

| Status   | Meaning                                      |
|----------|----------------------------------------------|
| pending  | Payment not yet received (COD or checkout)   |
| paid     | Payment successfully captured                |
| failed   | Online payment attempt failed                |
| refunded | Payment returned to customer                 |

## COD Orders

- Payment is collected at delivery
- Order status moves to **paid** when marked **delivered**
- Failed delivery does not charge the customer

## Online Payments

- Payment is captured at checkout via Razorpay
- Failed payments do not create a confirmed order
- Refunds for eligible cancellations go back to the original payment method

## Security

All online payments are processed through Razorpay's PCI-compliant gateway. SmartInventory does not store full card numbers.
