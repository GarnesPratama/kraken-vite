import { GridColumnMenuFilter, GridColumnMenuCheckboxFilter, type GridColumnMenuProps } from '@progress/kendo-react-grid';


export const ColumnMenu = (props: GridColumnMenuProps) => {
    return (
        <div>
            <GridColumnMenuFilter {...props} expanded={true} />
        </div>
    );
};

// export const ColumnMenuCheckboxFilter = (props: GridColumnMenuProps) => {
//     return (
//         <div>
//             <GridColumnMenuCheckboxFilter {...props} data={products} expanded={true} />
//         </div>
//     );
// };