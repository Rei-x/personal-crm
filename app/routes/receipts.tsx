import { db } from "@/server/db";
import { useLoaderData } from "@remix-run/react";
import { groupBy, prop, sortBy } from "remeda";

export const loader = async () => {
  return {
    receipts: await db.query.receipts.findMany({
      with: {
        receiptItems: true,
      },
    }),
  };
};

const Receipts = () => {
  const data = useLoaderData<typeof loader>();

  const groupedByItem = sortBy(
    Object.entries(
      groupBy(
        data.receipts.flatMap((r) => r.receiptItems),
        (r) => r.name
      )
    ).map(([name, items]) => ({
      name,
      items: sortBy(items, prop("unitPrice")),
      count: items.length,
      sum: items.reduce((acc, item) => acc + parseFloat(item.unitPrice), 0),
    })),
    [prop("sum"), "desc"]
  );

  return (
    <div>
      <h1>Paragony</h1>
      <h2>Grupowane po produkcie</h2>
      <div>
        <ul>
          {groupedByItem.map((item) => (
            <li key={item.name}>
              {item.name} - {Math.round(item.sum)} zł
              <details>
                <summary>Details</summary>
                <div>
                  <ol>
                    {item.items.map((item) => (
                      <li key={item.code}>
                        <details className="ml-2">
                          <summary>
                            {item.name} - {item.quantity} x {item.unitPrice}
                          </summary>
                          <pre>{JSON.stringify(item, null, 2)}</pre>
                        </details>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
      <div></div>
    </div>
  );
};

export default Receipts;
