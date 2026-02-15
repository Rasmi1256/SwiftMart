// backend/promotions-service/src/controllers/couponController.ts
import { Request, Response } from 'express';
import { prisma, Coupon } from 'database';

// --- Helper Validation Function ---
const validateCoupon = (coupon: Coupon, orderTotal: number, itemIds: string[]): { isValid: boolean, message: string } => {
  const now = new Date();

  if (!coupon.isActive) {
    return { isValid: false, message: 'Coupon is not active.' };
  }
  if (coupon.validFrom > now || coupon.validUntil < now) {
    return { isValid: false, message: 'Coupon is expired or not yet valid.' };
  }
  if (coupon.usesCount >= coupon.maxUses) {
    return { isValid: false, message: 'Coupon usage limit reached.' };
  }
  if (orderTotal < coupon.minimumOrderAmount) {
    return { isValid: false, message: `Minimum order of $${coupon.minimumOrderAmount.toFixed(2)} required.` };
  }
  
  // NOTE: For 'category'/'product' applicableTo, a real system would need 
  // to check the order items (itemIds) against the product/category ID.
  // We'll skip complex item-level logic for this MVP to keep the order service simple.
  
  return { isValid: true, message: 'Coupon is valid.' };
};

// @desc    Calculate and apply the discount from a coupon
// @route   POST /api/promotions/validate
// @access  Private (User Only)
export const validateAndApplyCoupon = async (req: Request, res: Response) => {
  const { code, orderTotal, itemIds = [] } = req.body;

  if (!code || typeof orderTotal !== 'number') {
    return res.status(400).json({ message: 'Coupon code and order total are required.' });
  }

  try {
    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }

    // 1. Validate the coupon
    const validation = validateCoupon(coupon, orderTotal, itemIds);

    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    // 2. Calculate the discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = orderTotal * (coupon.discountValue / 100);
    } else { // fixed_amount
      discountAmount = coupon.discountValue;
    }
    
    // Ensure discount doesn't exceed total (though fixed amounts usually do not)
    discountAmount = Math.min(discountAmount, orderTotal);

    res.status(200).json({
      message: 'Coupon validated and applied successfully.',
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      couponDetails: {
        code: coupon.code,
        description: coupon.description,
        type: coupon.discountType,
        value: coupon.discountValue,
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ message: 'Server error validating coupon.' });
  }
};


// @desc    Admin: Create a new coupon
// @route   POST /api/promotions/admin/coupons
// @access  Private (Admin Only)
export const createCoupon = async (req: Request, res: Response) => {
  // NOTE: Admin check middleware should be used here!
  // if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' }); 

  try {
    const newCoupon = await prisma.coupon.create({ data: req.body });
    res.status(201).json({
        message: 'Coupon created successfully.',
        coupon: newCoupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    if ((error as any).code === 'P2002') {
         return res.status(400).json({ message: 'Coupon code already exists.' });
    }
    res.status(500).json({ message: 'Server error creating coupon.' });
  }
};

// @desc    Internal: Mark coupon as used (Called by Order Service after final payment)
// @route   PUT /api/promotions/internal/use
// @access  Internal Only
export const markCouponAsUsed = async (req: Request, res: Response) => {
    const { code } = req.body;
    
    // NOTE: In a real system, this endpoint would be protected by an internal API key
    // or IP whitelisting, not just JWT. We skip that for the MVP simplicity.

    try {
        const coupon = await prisma.coupon.findFirst({
            where: { code, isActive: true }
        });

        if (!coupon) {
            return res.status(404).json({ message: 'Active coupon not found.' });
        }

        // Final check to prevent over-use if the transaction was slow
        if (coupon.usesCount >= coupon.maxUses) {
            return res.status(400).json({ message: 'Coupon usage limit already reached.' });
        }

        const updatedCoupon = await prisma.coupon.update({
            where: { id: coupon.id },
            data: { usesCount: coupon.usesCount + 1 }
        });

        res.status(200).json({
            message: 'Coupon marked as used.',
            newUsesCount: updatedCoupon.usesCount
        });

    } catch (error) {
        console.error('Error marking coupon as used:', error);
        res.status(500).json({ message: 'Server error marking coupon as used.' });
    }
};