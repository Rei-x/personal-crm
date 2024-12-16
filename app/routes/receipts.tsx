import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { lidlPlusClient } from "@/server/services/lidlPlus/client";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";

export const loader = async () => {
  return {
    receipts: await lidlPlusClient.receipts(),
  };
};

const Receipt = ({ id }: { id: string }) => {
  const [shouldFetch, setShouldFetch] = useState(false);
  const receipt = trpc.lidl.getReceipt.useQuery(
    {
      id,
    },
    {
      enabled: shouldFetch,
    }
  );

  if (!receipt.data) {
    return <Button onClick={() => setShouldFetch(true)}>Fetch</Button>;
  }

  return (
    <div>
      <p>{receipt.data.id}</p>
      <ol>
        {receipt.data.itemsLine.map((item) => (
          <li key={item.codeInput}>
            <details>
              <summary>
                {item.name} - {item.quantity} x {item.currentUnitPrice} ={" "}
                {item.originalAmount}
              </summary>
              <pre>{JSON.stringify(item, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
};

const Receipts = () => {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Paragony</h1>
      <div>
        <ul>
          {data.receipts.map((r) => (
            <li key={r.id}>
              {r.totalAmount}

              <details>
                <summary>Details</summary>
                <Receipt id={r.id} />
              </details>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Receipts;
