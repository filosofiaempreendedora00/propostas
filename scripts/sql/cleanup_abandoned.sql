-- Remove registros de "assinante" que na verdade foram carrinho abandonado
-- (entraram como 'canceled' por engano, antes do fix do webhook).
-- Preciso e seguro: só apaga linhas cujo payload da Kiwify diz status=abandoned.
-- O refund real (robertofachetti2) tem raw.status != 'abandoned' e NÃO é tocado.

delete from public.billing_customers
where status = 'canceled'
  and (raw->>'status') = 'abandoned';
