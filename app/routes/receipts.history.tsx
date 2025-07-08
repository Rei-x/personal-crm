import { db } from "@/server/db";
import { useLoaderData, Link } from "react-router";
import { format } from "date-fns";
import { sortBy } from "remeda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export const loader = async () => {
  return {
    receipts: await db.query.receipts.findMany({
      with: {
        receiptItems: true,
      },
      orderBy: (receipts, { desc }) => [desc(receipts.receiptDate)],
    }),
  };
};

const ReceiptsHistory = () => {
  const data = useLoaderData<typeof loader>();

  const receiptsWithTotals = data.receipts.map((receipt) => {
    const total = receipt.receiptItems.reduce(
      (sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.unitPrice),
      0
    );
    return {
      ...receipt,
      total,
    };
  });

  const sortedReceipts = sortBy(
    receiptsWithTotals,
    (receipt) => new Date(receipt.receiptDate ?? new Date())
  ).reverse(); // Reverse to get descending order

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/receipts">
              <Button variant="outline">
                ← Analiza
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Historia Paragonów</h1>
          </div>
          <Badge variant="secondary">
            {sortedReceipts.length} {sortedReceipts.length === 1 ? "paragon" : "paragonów"}
          </Badge>
        </div>
        
        <div className="grid gap-4">
          {sortedReceipts.map((receipt) => (
            <Card key={receipt.id} className="w-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Paragon z {format(new Date(receipt.receiptDate ?? new Date()), "dd.MM.yyyy")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(receipt.receiptDate ?? new Date()), "HH:mm")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {receipt.total.toFixed(2)} zł
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {receipt.receiptItems.length} {receipt.receiptItems.length === 1 ? "przedmiot" : "przedmiotów"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {receipt.receiptItems.map((item, index) => (
                      <div key={item.id}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Kod: {item.code}
                              {item.isWeight && " (waga)"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {item.quantity} × {item.unitPrice} zł
                            </p>
                            <p className="text-sm text-muted-foreground">
                              = {(parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2)} zł
                            </p>
                          </div>
                        </div>
                        {index < receipt.receiptItems.length - 1 && (
                          <Separator className="mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReceiptsHistory;