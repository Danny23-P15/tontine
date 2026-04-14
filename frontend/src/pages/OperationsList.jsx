import { useEffect } from "react";

function OperationsList() {
  useEffect(() => {
    document.title = "Operations List";
  }, []);

    return (
        <div>
            <h1>Operations List</h1>
            <p>This is the Operations List page.</p>
        </div>
    );
}

export default OperationsList;