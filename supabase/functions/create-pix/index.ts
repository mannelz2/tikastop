import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRODUCT_NAMES = [
  "Método TurboFlow",
  "Protocolo Alta Performance",
  "Rotina Imparável",
  "Método Produtividade 3X",
  "Fórmula do Foco Absurdo",
  "Método FlowMaster",
  "Sistema Mental de Execução",
  "Método 5H por Dia",
  "Máquina de Performance",
  "Código da Rotina Blindada"
];

interface CreatePixRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  pixKey: string;
  pixKeyType: string;
  amount?: number;
  itemTitle?: string;
  transactionType?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const aureoPublicKey = Deno.env.get("AUREO_PUBLIC_KEY");
    const aureoSecretKey = Deno.env.get("AUREO_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!aureoPublicKey || !aureoSecretKey) {
      throw new Error("Chaves da Aureo não configuradas");
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase não configurado");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: CreatePixRequest = await req.json();

    const amountInCents = body.amount || 100;
    const amountInReais = amountInCents / 100;
    const transactionType = body.transactionType || "initial";
    const randomProductName = PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)];

    let itemTitle = body.itemTitle || randomProductName;
    if (transactionType === "iof") {
      itemTitle = "IOF - Imposto sobre Operações Financeiras";
    }

    if (amountInCents <= 0) {
      throw new Error("Valor inválido");
    }

    const reference = `pix-${Date.now()}-${transactionType}`;
    const auth = `Basic ${btoa(`${aureoPublicKey}:${aureoSecretKey}`)}`;

    const payload = {
      amount: amountInCents,
      paymentMethod: "pix",
      postbackUrl: `${supabaseUrl}/functions/v1/aureopay-webhook`,
      externalRef: reference,
      metadata: JSON.stringify({
        transactionType: transactionType,
        pixKey: body.pixKey,
        pixKeyType: body.pixKeyType,
      }),
      customer: {
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone.replace(/\D/g, ""),
        document: {
          type: "cpf",
          number: body.customerDocument.replace(/\D/g, ""),
        },
      },
      items: [
        {
          title: itemTitle,
          quantity: 1,
          tangible: false,
          unitPrice: amountInCents,
          externalRef: reference,
        },
      ],
    };

    const response = await fetch("https://api.aureolink.com.br/v1/transactions", {
      method: "POST",
      headers: {
        "Authorization": auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Erro HTTP ${response.status} da Aureo:`, error);
      throw new Error(`Erro da Aureo (${response.status}): ${error}`);
    }

    const data = await response.json();
    console.log("Resposta completa da Aureo:", JSON.stringify(data, null, 2));

    let transaction;
    if (data.data && data.data.id) {
      transaction = data.data;
    } else if (data.id) {
      transaction = data;
    } else {
      console.error("Formato de resposta não reconhecido:", data);
      throw new Error(`Resposta inválida da Aureo: ${JSON.stringify(data)}`);
    }

    console.log("Transaction processada:", {
      id: transaction.id,
      status: transaction.status,
      hasPix: !!transaction.pix,
      hasQrcode: !!transaction.pix?.qrcode
    });

    const expiresAt = transaction.pix?.expirationDate ? new Date(transaction.pix.expirationDate) : null;

    const { error: dbError } = await supabase.from("transactions").insert({
      transaction_id: transaction.id.toString(),
      customer_name: body.customerName,
      customer_email: body.customerEmail,
      customer_phone: body.customerPhone,
      customer_document: body.customerDocument,
      pix_key: body.pixKey,
      pix_key_type: body.pixKeyType,
      amount: amountInReais,
      status: transaction.status || "waiting_payment",
      qrcode: transaction.pix?.qrcode || "",
      expiration_date: expiresAt ? expiresAt.toISOString().split("T")[0] : null,
      transaction_type: transactionType,
    });

    if (dbError) {
      console.error("Erro ao salvar transação no banco:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        qrcode: transaction.pix?.qrcode || "",
        amount: amountInReais,
        expirationDate: expiresAt ? expiresAt.toISOString() : null,
        status: transaction.status || "waiting_payment",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao criar PIX:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});